import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLayout, layoutHash, importDelimited, type Layout } from "../src/migration/engine.js";

const goodLayout: Layout = { recordLength: 12, fields: [
  { name: "CODE", type: "char", length: 4, encoding: "utf8", key: true },
  { name: "AMT", type: "packed", length: 5, decimals: 2 },
  { name: "QTY", type: "zoned", length: 3, decimals: 0 } ] };

test("validateLayout accepts a consistent layout and rejects broken ones", () => {
  validateLayout(goodLayout);
  assert.throws(() => validateLayout({ ...goodLayout, recordLength: 99 }), /sum to 12/);
  assert.throws(() => validateLayout({ recordLength: 12, fields: [{ name: "X", type: "packed", length: 12, decimals: 30 }] }), /decimal scale/);
  assert.throws(() => validateLayout({ recordLength: 4, fields: [{ name: "X", type: "char", length: 4, encoding: "koi8" as any }] }), /unsupported encoding/);
});
test("layoutHash is stable and definition-sensitive", () => {
  assert.equal(layoutHash(goodLayout), layoutHash(JSON.parse(JSON.stringify(goodLayout))));
  assert.notEqual(layoutHash(goodLayout), layoutHash({ ...goodLayout, recordLength: 13 }));
});
test("delimited import: numerics arrive as decimal TEXT, Arabic decodes, bad rows quarantine", () => {
  const fields = [
    { name: "CODE", type: "char", length: 0, key: true },
    { name: "NAME", type: "char", length: 0 },
    { name: "AMT", type: "packed", length: 0, decimals: 2 } ] as any;
  const line1 = Buffer.concat([Buffer.from("A1,"), Buffer.from([0xE3, 0xCF, 0xD1, 0xD3, 0xC9, 0x20, 0xC7, 0xE1, 0xE4, 0xED, 0xE1]), Buffer.from(",1250.75")]); // "مدرسة النيل" in windows-1256 bytes
  const line2 = Buffer.from("A2,plain,not-a-number");
  const line3 = Buffer.from("A3,short");
  const data = Buffer.concat([line1, Buffer.from("\n"), line2, Buffer.from("\n"), line3, Buffer.from("\n")]);
  const r = importDelimited(data, fields, { encoding: "windows-1256", batchId: "mig-delim" });
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].values.NAME, "مدرسة النيل");
  assert.equal(r.records[0].values.AMT, "1250.75"); // exact decimal text — NOT packed bytes
  assert.equal(r.controlTotals.AMT, "1250.75");
  assert.equal(r.rejected.length, 2);
});
