import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import pg from "pg";
import { validateLayout, layoutHash, type Layout } from "../migration/engine.js";
import { streamImportFile } from "../migration/stream.js";

// Large-file import: streaming, chunked, checkpointed. Same layout registry rules as
// import-extract. Usage:
//   DATABASE_URL=... node import-stream.js <extract> <layout.json> --table <schema.table>
//     [--layout-name N] [--chunk-records 500] [--register-layout --registered-by NAME]
const args = process.argv.slice(2);
const [file, layoutPath] = args;
const table = args.includes("--table") ? args[args.indexOf("--table") + 1] : undefined;
const layoutName = args.includes("--layout-name") ? args[args.indexOf("--layout-name") + 1] : "extract-v1";
const chunkRecords = args.includes("--chunk-records") ? Number(args[args.indexOf("--chunk-records") + 1]) : 500;
const registerLayout = args.includes("--register-layout");
const registeredBy = args.includes("--registered-by") ? args[args.indexOf("--registered-by") + 1] : undefined;
if (!file || !layoutPath || !table || !process.env.DATABASE_URL) { console.error("usage: import-stream <extract> <layout.json> --table <schema.table> (DATABASE_URL required)"); process.exit(1); }
const layout = JSON.parse(readFileSync(layoutPath, "utf8")) as Layout;
validateLayout(layout);
const lhash = layoutHash(layout);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = { query: (t: string, v?: unknown[]) => client.query(t, v as any) };
try {
  const reg = await db.query("SELECT sha256 FROM mig.layouts WHERE name = $1", [layoutName]);
  if (!reg.rows.length) {
    if (!registerLayout || !registeredBy) throw new Error(`layout '${layoutName}' is not registered — use --register-layout --registered-by <name>`);
    await db.query("INSERT INTO mig.layouts (name, sha256, layout_json, registered_by) VALUES ($1,$2,$3,$4)", [layoutName, lhash, JSON.stringify(layout), registeredBy]);
  } else if (reg.rows[0].sha256 !== lhash) throw new Error(`layout '${layoutName}' hash mismatch — refusing to load`);
  const t0 = Date.now();
  const r = await streamImportFile(db, file, layout, { table, layoutName, chunkRecords,
    onProgress: (p, t) => console.error(`progress: ${p}/${t} records`) });
  const totals = await db.query("SELECT field, kind, amount::text a FROM mig.batch_totals WHERE batch_id = $1 ORDER BY field, kind", [r.batchId]);
  const batch = await db.query("SELECT loaded, rejected, total_records FROM mig.batches WHERE batch_id = $1", [r.batchId]);
  console.log(JSON.stringify({ ...r, batch: batch.rows[0], cumulativeTotals: totals.rows,
    elapsedMs: Date.now() - t0 }, null, 2));
} finally { await client.end(); }
