# Six-Module Migration Coverage — 2026-11-12

Statuses distinguish: IMPLEMENTED+TESTED (executed against PostgreSQL with synthetic
fixtures), READY-BLOCKED (importer/staging built; transform cannot be honestly
specified until customer evidence arrives), and the standing rule that NOTHING here
is verified against customer data.

| Subsystem | Staging (126-table schema) | Transform to operational | Reconciliation | Status |
|---|---|---|---|---|
| School Map | PBLBULDG import proven E2E | pblbuldg→buildings, approval-gated, tested | VGCD control/source totals exact | IMPLEMENTED+TESTED (synthetic) |
| Budget | CBABDALW and 8 other files staged by schema | NONE — CBABDALW is an allowances file; the operational allocation model needs the PBA3* masters | Staging-level totals available | READY-BLOCKED on B-01 |
| Purchases & Contracts | PBYTENDR staged by schema | pbytendr→tenders, approval-gated, tested (Arabic title intact) | Record counts | IMPLEMENTED+TESTED (synthetic) |
| Technical Abstracts / Certificates | INV001PF staged by schema | inv001pf→certificates (header load), approval-gated, tested with fixture approvals | BILVLU exact to NUMERIC(19,4) | IMPLEMENTED (synthetic) — AWAITING CUSTOMER VERIFICATION, B-02 authoritative definition + B-08 deduction model |
| Estimates / BOQ | No item-master PF identified in delivery | NONE specifiable | n/a | BLOCKED on B-13 (see Data Request Pack §3) |
| Real Estate | REMV01PF staged by schema | remv01pf→expropriation_cases (pre-decree, building join), approval-gated, tested | Record counts; TOT deliberately unmapped (meaning unconfirmed) | IMPLEMENTED+TESTED (synthetic), partial field coverage |

Every transform refuses to run without authenticated mapping approvals bound to the
hash of its current definition (mig.mapping_approvals). In production those approvals
must come from GAEB-signed mapping reviews; the integration run used fixture
approvals labeled as such.
