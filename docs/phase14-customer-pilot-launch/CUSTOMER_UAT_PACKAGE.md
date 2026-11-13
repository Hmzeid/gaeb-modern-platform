# Phase 14 — Customer UAT Package (Workstream H)

The execution sheet (20 scenarios with the full column set —
ID, module, objective, preconditions, steps, expected result,
**actual result, evidence reference, defect ID, tester,
reviewer, status, approval**) is
`docs/phase11-controlled-pilot/UAT_EXECUTION_SHEET.csv`; the
defect register template sits beside it. This document fixes
the rules around it.

## Scenario coverage (final)
Authentication & role boundaries (incl. finance-visibility
refusal) · School Map search/pagination/drawer · Geographic
Intelligence → register drill-through · Budget views ·
Tenders full lifecycle + skip-stage refusal · Certificates
exact valuation + certifier-cannot-pay refusal · Estimates
review flow · Real Estate decree gate · Reports + CSV ·
Administration incl. the pilot panel · Migration Center:
reconciliation reading, quarantine review, approvals ·
**migration refusal paths** (import without an active pilot;
transform after revocation) · **full Arabic workflow** end to
end · error recovery (duplicate file re-import, wrong-format
file). Financial reconciliation scenarios execute against the
pilot batches' signed reconciliation packages.

## Rules
Every scenario remains **NOT RUN** until a named GAEB tester
executes it in the pilot environment and a GAEB reviewer signs
the row. Internal automated suites already exercise these
behaviors on synthetic data (mapping in the Phase 11 UAT
package) — that is internal evidence, never customer UAT, and
the sheet does not borrow its status. Exceptions are recorded
decisions (owner + date), not silent passes. Failed runs stay
in the record; retests are new entries.
