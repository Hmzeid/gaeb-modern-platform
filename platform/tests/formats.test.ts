import { test } from "node:test";
import assert from "node:assert/strict";
import { importFixedWidth, importFixedText, importDelimited, parseDelimitedText, decodeTextNumber, newJob, type Layout } from "../src/migration/engine.js";

test("decodeTextNumber: EBCDIC digits, ASCII, signs, decimal comma", () => {
  assert.equal(decodeTextNumber(Buffer.from([0xF1, 0xF2, 0x4B, 0xF5]), 2), "12.5");
  assert.equal(decodeTextNumber(Buffer.from("  -42.07 "), 2), "-42.07");
  assert.equal(decodeTextNumber(Buffer.from("42.07-"), 2), "-42.07");
  assert.equal(decodeTextNumber(Buffer.from("12,5"), 1, ","), "12.5");
  assert.throws(() => decodeTextNumber(Buffer.from("12}"), 0), /not a decimal/); // overpunch = wrong format, refuse
});
const textLayout: Layout = { format: "fixed-text", recordLength: 16, fields: [
  { name: "CODE", type: "char", length: 4, encoding: "utf8", key: true },
  { name: "AMT", type: "packed", length: 8, decimals: 2 },
  { name: "DT", type: "date", length: 4 + 0, decimals: 0 } ] };
// fix geometry: 4 + 8 + 8 = 20
textLayout.fields[2].length = 8; textLayout.recordLength = 20;
test("fixed-TEXT import: numerics are character text, never packed-decoded; bad date quarantines", () => {
  const rec = (amt: string, dt: string) => Buffer.concat([Buffer.from("A001"), Buffer.from(amt.padStart(8)), Buffer.from(dt)]);
  const data = Buffer.concat([rec("1250.75", "20251112"), rec("99999999", "20251340")]); // second: month 13
  const { records, report } = importFixedText(data, textLayout, newJob("mig-t"));
  assert.equal(records.length, 1);
  assert.equal(records[0].values.AMT, "1250.75");
  assert.equal(records[0].values.DT, "2025-11-12");
  assert.equal(report.rejected.length, 1);
  assert.match(report.rejected[0].reason, /invalid calendar date/);
});
test("format confusion is refused both ways", () => {
  const bin = Buffer.alloc(20);
  assert.throws(() => importFixedWidth(bin, textLayout, newJob("x")), /refusing to decode it as native binary/);
  const binLayout: Layout = { recordLength: 20, fields: textLayout.fields };
  assert.throws(() => importFixedText(bin, binLayout, newJob("x")), /refusing to decode it as fixed text/);
});
test("CSV parser: quotes, embedded delimiters, embedded newlines, escaped quotes", () => {
  const rows = parseDelimitedText('a,"b,c","line1\nline2","say ""hi"""\n1,2,3,4\n', ",");
  assert.deepEqual(rows[0], ["a", "b,c", "line1\nline2", 'say "hi"']);
  assert.deepEqual(rows[1], ["1", "2", "3", "4"]);
  assert.throws(() => parseDelimitedText('a,"unterminated', ","), /unterminated quoted/);
});
test("delimited import: accounting negatives, null marker, date field, Arabic preserved", () => {
  const fields = [
    { name: "CODE", type: "char", length: 0, key: true },
    { name: "NAME", type: "char", length: 0 },
    { name: "AMT", type: "packed", length: 0, decimals: 2 },
    { name: "DT", type: "date", length: 0 } ] as any;
  const csv = 'A1,مدرسة النيل,"(1,250.75)",20250131\nA2,x,*NULL,20250131\nA3,y,10.00,20250230\n';
  const r = importDelimited(Buffer.from(csv, "utf8"), fields, { encoding: "utf8", nullMarker: "*NULL", batchId: "mig-d" });
  assert.equal(r.records.length, 1);
  assert.equal(r.records[0].values.AMT, "-1250.75");
  assert.equal(r.records[0].values.NAME, "مدرسة النيل");
  assert.equal(r.records[0].values.DT, "2025-01-31");
  assert.equal(r.rejected.length, 2); // null numeric + Feb 30
});
