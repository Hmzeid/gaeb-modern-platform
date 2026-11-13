// CLI wrapper for the preflight validator: hashes and structurally profiles
// an extract against its manifest WITHOUT importing anything.
// Usage: node tools/preflight.mjs <file> <layout.json> [manifestSha256] [manifestRecordCount]
import { readFileSync } from "node:fs";
import { preflightFile } from "../dist/src/migration/preflight.js";

const [file, layoutPath, sha, count] = process.argv.slice(2);
if (!file || !layoutPath) { console.error("usage: preflight.mjs <file> <layout.json> [sha256] [recordCount]"); process.exit(2); }
const layout = JSON.parse(readFileSync(layoutPath, "utf8"));
const rep = await preflightFile(file, layout, { manifestSha256: sha, manifestRecordCount: count ? Number(count) : undefined });
console.log(JSON.stringify(rep, null, 1));
process.exit(rep.verdict === "REJECT" ? 1 : 0);
