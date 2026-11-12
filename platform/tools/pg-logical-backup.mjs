// Phase 6 Workstream C (logical): pg_dump custom-format backup of the source
// database, integrity-checked with pg_restore --list, restored into a clean
// database with pg_restore, and verified by per-table fingerprints plus an
// application-level reconciliation read on the restored database.
// Usage: SOURCE_URL=postgres://.../gaeb_test OUT_DIR=<dir> node tools/pg-logical-backup.mjs
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync, mkdirSync } from "node:fs";
import pg from "pg";
import { fingerprintDb, compareFingerprints } from "./pg-fingerprint.mjs";
import { computeReconciliation } from "../dist/src/migration/reconcile.js";

const src = process.env.SOURCE_URL, outDir = process.env.OUT_DIR;
if (!src || !outDir) { console.error("SOURCE_URL and OUT_DIR required"); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const dumpFile = `${outDir}/gaeb-logical.dump`;
const base = src.replace(/\/[^/]+$/, "");
const srcDb = src.split("/").pop();

console.log("== source fingerprints ==");
const before = await fingerprintDb(src);
for (const [t, v] of Object.entries(before)) console.log(`  ${t}: ${v.rows} rows ${v.fingerprint ? v.fingerprint.slice(0, 12) : v.note}`);

let t0 = Date.now();
execFileSync("pg_dump", ["-Fc", "-f", dumpFile, src], { stdio: "inherit" });
const dumpMs = Date.now() - t0;
const dumpBytes = statSync(dumpFile).size;
const dumpSha = createHash("sha256").update(readFileSync(dumpFile)).digest("hex");
console.log(`pg_dump: ${dumpBytes} bytes in ${dumpMs} ms, sha256 ${dumpSha}`);
const list = execFileSync("pg_restore", ["--list", dumpFile], { encoding: "utf8" });
console.log(`pg_restore --list: integrity OK (${list.split("\n").filter(l => l && !l.startsWith(";")).length} archive entries)`);

const admin = new pg.Pool({ connectionString: `${base}/postgres` });
await admin.query("DROP DATABASE IF EXISTS gaeb_pgrestored");
await admin.query("CREATE DATABASE gaeb_pgrestored");
await admin.end();
t0 = Date.now();
execFileSync("pg_restore", ["-d", `${base}/gaeb_pgrestored`, "--no-owner", dumpFile], { stdio: "inherit" });
const restoreMs = Date.now() - t0;
console.log(`pg_restore into gaeb_pgrestored: ${restoreMs} ms (measured restore duration)`);

console.log("== restored fingerprints ==");
const after = await fingerprintDb(`${base}/gaeb_pgrestored`);
const diffs = compareFingerprints(before, after);
for (const [t, v] of Object.entries(after)) console.log(`  ${t}: ${v.rows} rows ${diffs.includes(t) ? "MISMATCH" : "MATCH"}`);

// Application-level check on the restored database: reconciliation of the
// fixture batch must still satisfy its equations.
const pool = new pg.Pool({ connectionString: `${base}/gaeb_pgrestored` });
const rec = await computeReconciliation(pool, "mig-integration-fixture");
console.log(`application check on restored DB: batch mig-integration-fixture source=${rec?.sourceRecords} loaded=${rec?.loadedRecords} quarantined=${rec?.quarantinedRecords} equation=${rec?.countEquationHolds}`);
await pool.end();

const pass = diffs.length === 0 && rec?.countEquationHolds === true;
console.log(JSON.stringify({ sourceDb: srcDb, dumpBytes, dumpMs, dumpSha256: dumpSha, restoreMs, tablesCompared: Object.keys(before).length, mismatches: diffs }));
console.log(pass ? "PG_DUMP LOGICAL BACKUP/RESTORE: PASS" : "PG_DUMP LOGICAL BACKUP/RESTORE: FAIL");
process.exit(pass ? 0 : 1);
