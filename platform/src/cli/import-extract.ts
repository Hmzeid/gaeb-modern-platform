import { readFileSync, writeFileSync } from "node:fs";
import { importFixedWidth, newJob, type Layout } from "../migration/engine.js";
// Usage: import-extract <extract-file> <layout.json> [records-out.jsonl]
// Report-only CLI: prints the import report (counts, rejects with reasons, exact
// control totals, source SHA-256). Loading the accepted records into the staging
// schema is done by the migration runner once a database is connected.
const [file, layoutPath, outPath] = process.argv.slice(2);
if (!file || !layoutPath) { console.error("usage: import-extract <extract-file> <layout.json> [records-out.jsonl]"); process.exit(1); }
const layout = JSON.parse(readFileSync(layoutPath, "utf8")) as Layout;
const { records, report } = importFixedWidth(readFileSync(file), layout, newJob(`batch-${Date.now()}`));
console.log(JSON.stringify(report, null, 2));
if (outPath) writeFileSync(outPath, records.map(r => JSON.stringify(r.values)).join("\n") + "\n");
