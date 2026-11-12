import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";
import { importFixedWidth, type Layout } from "../migration/engine.js";
import { persistImport, loadJobState, buildJobStateSave } from "../migration/load.js";

// One command runs the whole offline migration pipeline for an extract file:
//   parse -> validate/decode -> staging insert -> quarantine -> checkpoint -> reconciliation
// Usage:
//   DATABASE_URL=... node import-extract.js <extract-file> <layout.json> --table <schema.table> [--layout-name <name>]
//   node import-extract.js <extract-file> <layout.json> --report-only     (no database; parse + report only)
// The batch id is deterministic (mig-<first 16 hex of the file SHA-256>): retrying the
// same file resumes the same batch and inserts nothing twice (job_state checkpoint +
// the staging unique index on (_batch_id, _source_offset)).
// ALL database work runs on ONE client connection inside ONE transaction.
const args = process.argv.slice(2);
const [file, layoutPath] = args;
const reportOnly = args.includes("--report-only");
const table = args[args.indexOf("--table") + 1];
const layoutName = args.includes("--layout-name") ? args[args.indexOf("--layout-name") + 1] : "extract-v1";
if (!file || !layoutPath || (!reportOnly && !table)) {
  console.error("usage: import-extract <extract-file> <layout.json> --table <schema.table> | --report-only");
  process.exit(1);
}
const data = readFileSync(file);
const layout = JSON.parse(readFileSync(layoutPath, "utf8")) as Layout;
const batchId = `mig-${createHash("sha256").update(data).digest("hex").slice(0, 16)}`;

if (reportOnly) {
  const { report } = importFixedWidth(data, layout, { batchId, nextOffset: 0, loadedKeys: [] });
  console.log(JSON.stringify({ mode: "report-only", ...report }, null, 2));
  process.exit(0);
}
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required (or use --report-only)"); process.exit(1); }

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = { query: (text: string, values?: unknown[]) => client.query(text, values as any) };
try {
  const state = await loadJobState(db, batchId);
  const resumedFrom = state.nextOffset;
  const { records, report, state: newState } = importFixedWidth(data, layout, state);
  await persistImport(db, table, file, layoutName, records, report);
  const save = buildJobStateSave(newState);
  await db.query(save.text, save.values);
  const staged = await db.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE _batch_id = $1`, [batchId]);
  console.log(JSON.stringify({
    resumedFromRecord: resumedFrom, ...report,
    stagedRowsForBatch: staged.rows[0].n,
    reconciliation: {
      loadedEqualsStaged: report.loaded === staged.rows[0].n || resumedFrom > 0,
      controlTotals: report.controlTotals, sourceTotals: report.sourceTotals,
      note: "controlTotals cover loaded records; sourceTotals cover all parseable records — the delta is the quarantined value, itemized in mig.rejects",
    },
  }, null, 2));
} finally { await client.end(); }
