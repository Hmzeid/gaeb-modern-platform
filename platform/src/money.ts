import { Decimal } from "decimal.js";

// Exact-decimal money handling. Financial values NEVER pass through JS float arithmetic.
// Storage: PostgreSQL NUMERIC(19,4) for money, NUMERIC(19,6) for quantities/prices where needed.
Decimal.set({ precision: 38, rounding: Decimal.ROUND_HALF_UP });

export type Money = Decimal;
export const money = (v: string | number | Decimal): Money =>
  v instanceof Decimal ? v : new Decimal(v);
export const MONEY_SCALE = 2; // EGP piasters — configurable per deployment (see docs/FINANCE.md)
export const roundMoney = (v: Money): Money => v.toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP);
export const moneyOut = (v: Money): string => roundMoney(v).toFixed(MONEY_SCALE);

/** Decode an IBM i packed-decimal (COMP-3) field: `length` digits, `decimals` implied places.
 *  Last nibble is the sign (C/F = +, D = -). Throws on malformed input — never guesses. */
export function decodePacked(buf: Buffer, decimals: number): Money {
  if (buf.length === 0) throw new Error("packed decimal: empty buffer");
  const digits: string[] = [];
  for (let i = 0; i < buf.length; i++) {
    const hi = buf[i] >> 4, lo = buf[i] & 0x0f;
    if (i === buf.length - 1) {
      if (hi > 9) throw new Error("packed decimal: digit nibble > 9");
      digits.push(String(hi));
      if (lo === 0x0d) digits.unshift("-");
      else if (lo !== 0x0c && lo !== 0x0f) throw new Error(`packed decimal: bad sign nibble 0x${lo.toString(16)}`);
    } else {
      if (hi > 9 || lo > 9) throw new Error("packed decimal: digit nibble > 9");
      digits.push(String(hi), String(lo));
    }
  }
  const raw = digits.join("");
  const neg = raw.startsWith("-");
  const body = neg ? raw.slice(1) : raw;
  const intPart = body.slice(0, body.length - decimals) || "0";
  const fracPart = decimals > 0 ? body.slice(body.length - decimals).padStart(decimals, "0") : "";
  return new Decimal((neg ? "-" : "") + intPart + (fracPart ? "." + fracPart : ""));
}

/** Decode a zoned-decimal field (digits in low nibbles, sign in the last byte's high nibble, EBCDIC or ASCII). */
export function decodeZoned(buf: Buffer, decimals: number, encoding: "ebcdic" | "ascii"): Money {
  let s = "";
  let negative = false;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    const last = i === buf.length - 1;
    if (encoding === "ebcdic") {
      const zone = b >> 4, num = b & 0x0f;
      if (num > 9) throw new Error("zoned decimal: bad digit");
      if (last) { if (zone === 0x0d) negative = true; else if (zone !== 0x0f && zone !== 0x0c) throw new Error("zoned decimal: bad sign zone"); }
      s += String(num);
    } else {
      const ch = String.fromCharCode(b);
      if (!/[0-9 ]/.test(ch)) throw new Error("zoned decimal: non-digit in ASCII field");
      s += ch === " " ? "0" : ch;
    }
  }
  const intPart = s.slice(0, s.length - decimals) || "0";
  const fracPart = decimals > 0 ? s.slice(s.length - decimals).padStart(decimals, "0") : "";
  return new Decimal((negative ? "-" : "") + intPart + (fracPart ? "." + fracPart : ""));
}

/** Certificate valuation, per INV001AR1 evidence: line value = measured quantity x contract price (QSTKVL = AQTY1 * ITPR).
 *  Deductions are typed (CUTKND): retention (percent of gross), advance recovery (fixed), penalty (fixed), other (fixed).
 *  Returns exact decimals; rounding applied once, at the money boundary. */
export interface CertLine { qty: Money; price: Money }
export interface Deduction { kind: "retention" | "advance" | "penalty" | "other"; percent?: Money; amount?: Money }
export function certificateTotals(lines: CertLine[], deductions: Deduction[]) {
  let gross = new Decimal(0);
  const lineValues = lines.map(l => {
    const v = l.qty.mul(l.price);
    gross = gross.plus(v);
    return v;
  });
  let totalDeductions = new Decimal(0);
  const dedValues = deductions.map(d => {
    const v = d.kind === "retention" ? gross.mul(d.percent ?? new Decimal(0)).div(100) : (d.amount ?? new Decimal(0));
    totalDeductions = totalDeductions.plus(v);
    return v;
  });
  const net = gross.minus(totalDeductions);
  if (net.isNegative()) throw new Error("certificate net is negative — deductions exceed gross; approval-based correction required");
  return { lineValues, gross, dedValues, totalDeductions, net };
}
