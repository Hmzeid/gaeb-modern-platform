import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStagingInsert, buildBatchInsert, buildRejectInserts, persistImport, type SqlExecutor } from "../src/migration/load.js";
import type { ImportReport } from "../src/migration/engine.js";

const rec = { values: { BLCD: "BLD001", AMT: "1500.5" }, raw: "abcd", offset: 62 };
const report: ImportReport = { batchId: "b1", sourceSha256: "f".repeat(64), startOffset: 0, totalRecords: 3, loaded: 2,
  rejected: [{ offset: 62, reason: "duplicate key BLD001", rawHex: "00ff" }],
  controlTotals: { AMT: "1751.25" }, sourceTotals: { AMT: "1752.25" } };

test("staging insert is parameterized and carries lineage (batch + raw source bytes)", () => {
  const q = buildStagingInsert("school_map.pblbuldg", "b1", rec);
  assert.match(q.text, /INSERT INTO school_map\.pblbuldg \(blcd, amt, _batch_id, _source_offset, _raw_hex\) VALUES \(\$1, \$2, \$3, \$4, \$5\) ON CONFLICT \(_batch_id, _source_offset\) DO NOTHING/i);
  assert.deepEqual(q.values, ["BLD001", "1500.5", "b1", 62, "abcd"]);
});
test("unsafe table or column names are refused (no SQL injection surface)", () => {
  assert.throws(() => buildStagingInsert("x; DROP TABLE users", "b1", rec));
  assert.throws(() => buildStagingInsert("a.b", "b1", { values: { "x) VALUES (1": "1" }, raw: "", offset: 0 }));
});
test("batch + reject builders carry the reconciliation figures verbatim", () => {
  const b = buildBatchInsert(report, "extract.dat", "buildings-v1");
  assert.equal(b.values[6], 1);
  assert.equal(JSON.parse(String(b.values[7])).AMT, "1751.25");
  const r = buildRejectInserts(report);
  assert.equal(r.length, 1); assert.equal(r[0].values[2], "duplicate key BLD001");
});
test("persistImport runs ledger, batch, totals, rejects, records and checkpoint in one transaction", async () => {
  const calls: string[] = [];
  const fake = { query: async (text: string) => { calls.push(text); return { rows: [{ id: 1 }] }; } };
  const state = { batchId: "b1", nextOffset: 3, loadedKeys: ["BLD001"] };
  const r = await persistImport(fake as any, "school_map.pblbuldg", "extract.dat", "buildings-v1", [rec], report, state);
  assert.equal(r.alreadyRecorded, false);
  assert.equal(calls[0], "BEGIN"); assert.equal(calls[calls.length - 1], "COMMIT");
  assert.ok(calls.some(c => c.includes("mig.batch_runs")) && calls.some(c => c.includes("mig.batch_totals")));
  assert.ok(calls.some(c => c.includes("mig.rejects")) && calls.some(c => c.includes("school_map")) && calls.some(c => c.includes("mig.job_state")));
});
test("persistImport is a no-op when the same run already committed (retry cannot corrupt totals)", async () => {
  const calls: string[] = [];
  const fake = { query: async (text: string) => { calls.push(text); return { rows: [] }; } }; // run insert returns nothing = already recorded
  const r = await persistImport(fake as any, "school_map.pblbuldg", "extract.dat", "buildings-v1", [rec], report);
  assert.equal(r.alreadyRecorded, true);
  assert.ok(!calls.some(c => c.includes("mig.batch_totals")), "totals must not be touched on a replayed run");
  assert.ok(!calls.some(c => c.includes("school_map")), "staging must not be touched on a replayed run");
});
