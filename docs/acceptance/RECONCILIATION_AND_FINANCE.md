# Reconciliation & Financial Accuracy Report — 2026-11-12

Evidence source: the PostgreSQL integration execution (docs/INTEGRATION_LOG_2026-11-12.txt,
regenerated this release) over clearly labeled synthetic fixtures.

## Migration reconciliation (buildings fixture, VGCD control field)
- Source total (all parseable records): 22,962,964
- Control total (loaded records): 15,308,643 — equals SUM(vgcd) over staged rows in
  PostgreSQL exactly (asserted in the test)
- Delta: 7,654,321 = exactly the quarantined duplicate's value; every rejected record
  is itemized in mig.rejects with offset, reason, and raw bytes
- Retry behaviour: cumulative totals live in mig.batch_totals and are fed by an
  append-only run ledger (mig.batch_runs). A retry that loads 0 records changes NO
  total and NO count — asserted after a real retry in the integration run
- Truncated tail (13 stray bytes) quarantined, never silently dropped

## Financial accuracy
- All money is NUMERIC(19,4) in PostgreSQL and decimal.js in code; binary float is
  never used for money anywhere in the pipeline
- Certificate valuation: line value = qty × price exactly; typed deductions; a
  negative net throws instead of clamping (unit-tested)
- Transform evidence: INV001PF fixture header BILVLU 125000.50 lands in
  app.certificates as gross 125000.5000 (storage scale), net identical, deductions 0
  — the header-load semantics are documented in the transform spec and gated on B-02/B-08

## What is NOT claimed
No figure here comes from customer data. Financial equivalence against the legacy
system requires GAEB's live control totals (Data Request Pack §4) and remains an open
acceptance gate.
