import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importFixedWidth, newJob, type Layout } from "../src/migration/engine.js";

// Synthetic demo extract (tests/fixture_extract.bin) — generated data, NOT customer records.
// Layout mirrors a building extract: key, Arabic name in CCSID 420, packed money.
const layout: Layout = { recordLength: 31, fields: [
  { name: "BLCD", type: "char", length: 6, encoding: "utf8", key: true },
  { name: "BLNM", type: "char", length: 20, encoding: "ibm420" },
  { name: "AMT", type: "packed", length: 5, decimals: 2 },
]};
const data = readFileSync(new URL("./fixture_extract.bin", import.meta.url));

test("offline extract import: decodes Arabic + packed money, quarantines duplicate and corrupt records", () => {
  const { records, report } = importFixedWidth(data, layout, newJob("demo-1"));
  assert.equal(report.totalRecords, 4);
  assert.equal(report.loaded, 2);
  assert.equal(report.rejected.length, 2);
  assert.match(report.rejected[0].reason, /duplicate key/);
  assert.ok(report.rejected[1].reason.length > 0);
  assert.equal(records[0].values.BLNM, "مدرسة النيل");
  assert.equal(records[0].values.AMT, "1500.5");
  assert.equal(records[1].values.AMT, "250.75");
});
test("reconciliation: control totals are exact decimals over loaded records", () => {
  const { report } = importFixedWidth(data, layout, newJob("demo-2"));
  assert.equal(report.controlTotals.AMT, "1751.25");       // 1500.50 + 250.75
  assert.equal(report.sourceTotals.AMT, "1752.25");        // + the duplicate's 1.00 — delta is visible, not hidden
});
test("resume: a second run with the saved job state loads nothing twice (idempotent)", () => {
  const job = newJob("demo-3");
  const first = importFixedWidth(data, layout, job);
  const second = importFixedWidth(data, layout, first.state);
  assert.equal(second.records.length, 0);
  assert.equal(second.report.loaded, 0);
});
test("lineage: report carries the source file hash and every record keeps its raw form", () => {
  const { records, report } = importFixedWidth(data, layout, newJob("demo-4"));
  assert.match(report.sourceSha256, /^[0-9a-f]{64}$/);
  assert.equal(records[0].raw.length, 62); // 31 bytes as hex
});
