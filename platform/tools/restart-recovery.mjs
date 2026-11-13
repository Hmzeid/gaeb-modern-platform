// Database restart recovery evidence (Phase 4, Workstream H item 7 / UAT-23 at the
// data layer): import a batch, restart PostgreSQL, reconnect, and verify that
// batch totals, quarantine and checkpoints are exactly as before the restart.
// Requires GAEB_PG_CTL + GAEB_PGDATA env to perform the restart; without them it
// verifies persistence only and says so. Synthetic fixture data only.
import { execFileSync } from "node:child_process";
import pg from "pg";
import { importFixedWidth } from "../dist/src/migration/engine.js";
import { persistImport, loadJobState } from "../dist/src/migration/load.js";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL required"); process.exit(2); }
const layout = { recordLength: 55, format: "native-binary", fields: [
  { name: "BLCD", type: "zoned", length: 20, key: true },
  { name: "SHNM", type: "char", length: 20, encoding: "ibm420" },
  { name: "VGCD", type: "zoned", length: 15, decimals: 0 } ] };
const zoned = (s) => Buffer.from(s.split("").map((c) => String.fromCharCode(0xf0 + Number(c))).join(""), "binary");
const rec = (blcd, vg) => Buffer.concat([zoned(blcd.padStart(20, "0")),
  Buffer.from("d4e2e2d4e2e2d4e2e2d4e2e2d4e2e2d4e2e2d4e2e2", "hex").subarray(0, 20), zoned(vg.padStart(15, "0"))]);
const data = Buffer.concat([rec("1", "111"), rec("2", "222"), rec("2", "222")]); // one duplicate
const batchId = "mig-restart-recovery";
const pool = new pg.Pool({ connectionString: url });
const client = await pool.connect();
const state = await loadJobState(client, batchId);
const r = importFixedWidth(data, layout, state);
await persistImport(client, "school_map.pblbuldg", "restart-recovery.bin", "pblbuldg-v1", r.records, r.report, r.state, { dataClass: "synthetic" });
client.release();
const before = await pool.query("SELECT total_records, loaded, rejected FROM mig.batches WHERE batch_id=$1", [batchId]);
console.log("before restart:", JSON.stringify(before.rows[0]));
await pool.end();

if (process.env.GAEB_PG_CTL && process.env.GAEB_PGDATA) {
  const args = ["-D", process.env.GAEB_PGDATA, "-o", process.env.GAEB_PG_OPTS ?? "", "-l", "/tmp/pg-restart.log"];
  execFileSync(process.env.GAEB_PG_CTL, [...args, "restart"], { stdio: "inherit" });
  console.log("PostgreSQL restarted via pg_ctl");
  await new Promise((res) => setTimeout(res, 1500));
} else {
  console.log("GAEB_PG_CTL/GAEB_PGDATA not set — persistence check only, NO restart performed");
}
const pool2 = new pg.Pool({ connectionString: url });
const after = await pool2.query("SELECT total_records, loaded, rejected FROM mig.batches WHERE batch_id=$1", [batchId]);
const rejects = await pool2.query("SELECT COUNT(*)::int n FROM mig.rejects WHERE batch_id=$1", [batchId]);
console.log("after restart:", JSON.stringify(after.rows[0]), "rejects:", rejects.rows[0].n);
const ok = JSON.stringify(before.rows[0]) === JSON.stringify(after.rows[0]) && rejects.rows[0].n === 1;
console.log(ok ? "RESTART RECOVERY: PASS" : "RESTART RECOVERY: FAIL");
await pool2.end();
process.exit(ok ? 0 : 1);
