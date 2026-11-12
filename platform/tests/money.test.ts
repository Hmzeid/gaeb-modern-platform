import { test } from "node:test";
import assert from "node:assert/strict";
import { decodePacked, decodeZoned, certificateTotals, money, moneyOut } from "../src/money.js";

test("packed decimal decodes value, scale and sign", () => {
  const packed = Buffer.from([0x12, 0x34, 0x56, 0x7c]); // digits 1234567, sign C, 2 decimals
  assert.equal(decodePacked(packed, 2).toString(), "12345.67");
  const neg = Buffer.from([0x12, 0x34, 0x56, 0x7d]);    // sign D
  assert.equal(decodePacked(neg, 2).toString(), "-12345.67");
  assert.throws(() => decodePacked(Buffer.from([0x12, 0x3a]), 0)); // bad sign nibble
});
test("zoned decimal (EBCDIC) decodes with negative sign zone", () => {
  const buf = Buffer.from([0xf1, 0xf2, 0xd3]); // 123 with D zone -> -12.3 at 1 decimal
  assert.equal(decodeZoned(buf, 1, "ebcdic").toString(), "-12.3");
});
test("certificate valuation is exact decimal (no float error)", () => {
  const t = certificateTotals(
    [{ qty: money("3"), price: money("0.1") }, { qty: money("7"), price: money("0.07") }],
    [{ kind: "retention", percent: money("10") }, { kind: "penalty", amount: money("0.05") }]);
  assert.equal(t.gross.toString(), "0.79");        // 0.30 + 0.49 exactly (float gives 0.7900000000000000x)
  assert.equal(t.totalDeductions.toString(), "0.129");
  assert.equal(moneyOut(t.net), "0.66");           // 0.661 -> 0.66 at the money boundary
});
test("certificate with deductions exceeding gross is rejected, not silently negative", () => {
  assert.throws(() => certificateTotals(
    [{ qty: money("1"), price: money("10") }], [{ kind: "penalty", amount: money("50") }]));
});
test("large packed-decimal contract value keeps full precision", () => {
  // 9,999,999,999.99 EGP in packed form: digits 999999999999, sign C, 2 decimals
  const packed = Buffer.from([0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x9c]);
  assert.equal(decodePacked(packed, 2).toString(), "99999999999.99"); // 13 digits, 2 decimals — beyond float53 exactness
});
