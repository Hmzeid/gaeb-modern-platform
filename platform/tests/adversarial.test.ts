import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { importFixedWidth, importDelimited, type JobState, type Layout } from "../src/migration/engine.js";

/**
 * Phase 4 Workstream C — adversarial synthetic fixtures against the real importers.
 * These attack the assumptions real GAEB extracts will violate: emptiness,
 * precision extremes, conflicting duplicates, wrong encodings, nulls-as-zero.
 * All data is synthetic and labelled as such.
 */
const job = (batchId: string): JobState => ({ batchId, nextOffset: 0, loadedKeys: [] });
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

function packed(digits: string, scale: number, neg = false): Buffer {
  const all = digits + (neg ? "d" : "c");
  const buf = Buffer.alloc(Math.ceil(all.length / 2));
  for (let i = 0; i < all.length; i += 2) buf[i / 2] = (parseInt(all[i], 16) << 4) | parseInt(all[i + 1] ?? "f", 16);
  return buf;
}
const LAYOUT: Layout = {
  recordLength: 12, format: "native-binary",
  fields: [
    { name: "ID", type: "zoned", length: 4, key: true },
    { name: "AMT", type: "packed", length: 6, decimals: 4 },   // up to 11 digits
    { name: "NM", type: "char", length: 2, encoding: "ibm420" },
  ],
};
function rec(id: string, amtDigits: string, neg = false): Buffer {
  const z = Buffer.from(id.split("").map(c => String.fromCharCode(0xf0 + Number(c))).join(""), "binary");
  const nm = Buffer.from([0xd4, 0xe2]); // Arabic letters in IBM420
  return Buffer.concat([z, packed(amtDigits, 4, neg), nm]);
}

test("adversarial: empty extract imports as an empty batch, not an error", () => {
  const r = importFixedWidth(Buffer.alloc(0), LAYOUT, job("adv-empty"));
  assert.equal(r.report.totalRecords, 0);
  assert.equal(r.report.loaded, 0);
  assert.equal(r.report.rejected.length, 0);
});

test("adversarial: packed precision extremes survive exactly (no float path)", () => {
  const data = Buffer.concat([rec("0001", "99999999999"), rec("0002", "00000000001"), rec("0003", "12345678901", true)]);
  const r = importFixedWidth(data, LAYOUT, job("adv-precision"));
  assert.equal(r.report.loaded, 3);
  assert.equal(r.report.controlTotals.AMT, "8765432.1099"); // 9999999.9999 + 0.0001 - 1234567.8901, exact decimal end to end
  const vals = r.records.map(x => x.values.AMT);
  assert.deepEqual(vals, ["9999999.9999", "0.0001", "-1234567.8901"]);
});

test("adversarial: conflicting duplicate key — first wins in staging, second is preserved as evidence", () => {
  const data = Buffer.concat([rec("0007", "00000010000"), rec("0007", "00000099999")]);
  const r = importFixedWidth(data, LAYOUT, job("adv-conflict"));
  assert.equal(r.report.loaded, 1);
  assert.equal(r.records[0].values.AMT, "1");
  assert.equal(r.report.rejected.length, 1);
  assert.match(r.report.rejected[0].reason, /duplicate key/);
  assert.ok(r.report.rejected[0].rawHex.length > 0, "the conflicting source record is preserved byte-for-byte, never silently deduplicated away");
  // Source totals still account for BOTH records — evidence is not erased.
  assert.equal(r.report.sourceTotals.AMT, "10.9999");
});

test("adversarial: unverifiable encoding (IBM425) quarantines every record — never mojibakes into staging", () => {
  const bad: Layout = { ...LAYOUT, fields: LAYOUT.fields.map(f => f.type === "char" ? { ...f, encoding: "ibm425" as const } : f) };
  const r = importFixedWidth(rec("0001", "00000000001"), bad, job("adv-425"));
  assert.equal(r.report.loaded, 0);
  assert.equal(r.report.rejected.length, 1);
  assert.match(r.report.rejected[0].reason, /ibm425/);
});

test("adversarial: delimited null in a numeric field rejects — never zero-filled", () => {
  const fields = [
    { name: "ID", type: "int" as const, length: 4, key: true },
    { name: "AMT", type: "packed" as const, length: 8, decimals: 2 },
  ];
  const csv = Buffer.from("1,NULL\r\n2,10.50\r\n", "utf8");
  const r = importDelimited(csv, fields, { batchId: "adv-null", nullMarker: "NULL" });
  assert.equal(r.records.length, 1);
  assert.equal(r.rejected.length, 1);
  assert.match(r.rejected[0].reason, /null/i);
  assert.equal(r.controlTotals.AMT, "10.5");
});

test("adversarial: delimited invalid calendar date rejects (2026-02-30 does not exist)", () => {
  const fields = [
    { name: "ID", type: "int" as const, length: 4, key: true },
    { name: "DT", type: "date" as const, length: 8 },
  ];
  const csv = Buffer.from("1,20260230\r\n2,20260228\r\n", "utf8");
  const r = importDelimited(csv, fields, { batchId: "adv-date" });
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].values.DT, "2026-02-28");
  assert.equal(r.rejected.length, 1);
});
