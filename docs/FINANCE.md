# Financial Precision Methodology

- All money is PostgreSQL NUMERIC(19,4) and decimal.js in the application layer. JavaScript
  `number` never touches a financial value; the POC's SQLite REAL columns are retired.
- Rounding happens once, at the money boundary (2 decimal places, ROUND_HALF_UP) —
  `roundMoney`/`moneyOut` in platform/src/money.ts. Internal math keeps full precision.
- Certificate valuation (INV001AR1 evidence): line value = measured quantity × contract
  price; deductions are typed (retention %, advance recovery, penalty, other); a negative
  net throws and requires an approval-based correction — it is never clamped to zero.
- Packed-decimal (COMP-3) and zoned-decimal decoders are exact and reject malformed sign
  nibbles instead of guessing (platform/src/money.ts, tested incl. a 13-digit value that
  exceeds float53 exactness).
- Control totals: migration reconciliation must compare source SUM roll-ups (SUM408R and
  the legacy inquiry totals) against target aggregates per subsystem before cutover gate
  approval. This check is specified, not yet executed (needs live data — B-06).
