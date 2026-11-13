import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";
import { importFixedWidth, validateLayout, layoutHash, type Layout } from "../migration/engine.js";
import { persistImport, loadJobState } from "../migration/load.js";

// One command runs the whole offline migration pipeline for an extract file:
//   verify layout -> parse -> validate/decode -> staging insert -> quarantine ->
//   checkpoint -> reconciliation, ALL on one client in one transaction.
// The layout is a controlled artifact: it is structurally verified on every run, and
// in database mode its hash must match the registered layout in mig.layouts — or be
// explicitly registered with --register-layout --registered-by <name> (an admin act).
// The batch id is deterministic (mig-<first 16 hex of the file SHA-256>): retrying the
// same file resumes the same batch; the run ledger makes total corruption impossible.
const args = process.argv.slice(2);
const [file, layoutPath] = args;
const reportOnly = args.includes("--report-only");
const table = args.includes("--table") ? args[args.indexOf("--table") + 1] : undefined;
const layoutName = args.includes("--layout-name") ? args[args.indexOf("--layout-name") + 1] : "extract-v1";
const registerLayout = args.includes("--register-layout");
const registeredBy = args.includes("--registered-by") ? args[args.indexOf("--registered-by") + 1] : undefined;
if (!file || !layoutPath || (!reportOnly && !table)) {
  console.error("usage: import-extract <extract-file> <layout.json> --table <schema.table> [--layout-name N] [--register-layout --registered-by NAME] | --report-only");
  process.exit(1);
}
const data = readFileSync(file);
const layout = JSON.parse(readFileSync(layoutPath, "utf8")) as Layout;
validateLayout(layout); // throws before a single byte is loaded under a bad layout
const lhash = layoutHash(layout);
const batchId = `mig-${createHash("sha256").update(data).digest("hex").slice(0, 16)}`;

if (reportOnly) {
  const { report } = importFixedWidth(data, layout, { batchId, nextOffset: 0, loadedKeys: [] });
  console.log(JSON.stringify({ mode: "report-only", layoutHash: lhash, ...report }, null, 2));
  process.exit(0);
}
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required (or use --report-only)"); process.exit(1); }
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = { query: (text: string, values?: unknown[]) => client.query(text, values as any) };
try {
  const reg = await db.query("SELECT sha256 FROM mig.layouts WHERE name = $1", [layoutName]);
  if (!reg.rows.length) {
    if (!registerLayout || !registeredBy) throw new Error(`layout '${layoutName}' is not registered in mig.layouts — register it with --register-layout --registered-by <name> (verified layouts only)`);
    await db.query("INSERT INTO mig.layouts (name, sha256, layout_json, registered_by) VALUES ($1,$2,$3,$4)", [layoutName, lhash, JSON.stringify(layout), registeredBy]);
    console.error(`layout '${layoutName}' registered by ${registeredBy} (sha256 ${lhash.slice(0, 12)}…)`);
  } else if (reg.rows[0].sha256 !== lhash) {
    throw new Error(`layout '${layoutName}' hash mismatch: the file's layout differs from the registered verified layout — refusing to load`);
  }
  const state = await loadJobState(db, batchId);
  const resumedFrom = state.nextOffset;
  const { records, report, state: newState } = importFixedWidth(data, layout, state);
  const persisted = await persistImport(db, table!, file, layoutName, records, report, newState);
  const staged = await db.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE _batch_id = $1`, [batchId]);
  const totals = await db.query("SELECT field, kind, amount::text AS a FROM mig.batch_totals WHERE batch_id = $1 ORDER BY field, kind", [batchId]);
  console.log(JSON.stringify({
    resumedFromRecord: resumedFrom, alreadyRecorded: persisted.alreadyRecorded, ...report,
    stagedRowsForBatch: staged.rows[0].n,
    cumulativeBatchTotals: totals.rows,
    note: "cumulativeBatchTotals come from mig.batch_totals (append-only run ledger) and survive retries unchanged",
  }, null, 2));
} finally { await client.end(); }
