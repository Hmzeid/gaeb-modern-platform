# Phase 12 — Customer UAT Execution Kit

Everything a GAEB test team needs on day one. The scenario sheet
itself (20 scenarios, all **NOT RUN**) is
`docs/phase11-controlled-pilot/UAT_EXECUTION_SHEET.csv`; the
defect register template sits beside it.

## Roles awaiting GAEB assignment
UAT Lead (owns the sheet and sign-offs) · School Map tester ·
Tenders tester · Certificates tester (finance) · Migration
reviewer (data owner delegate) · Arabic-workflow tester ·
Administrator-tester. Names are GAEB's to assign — the pilot
registry's `participants_assigned` condition is attested against
this list once named.

## Access instructions
Pilot environment URL + per-role accounts are issued by the
platform administrator at P0 close-out; accounts are individual
(no shared logins); passwords are set by each user on first
sign-in through the administrator's reset procedure. Sessions
last 8 hours; the audit log records every action per user.

## Scenario sequence
Week 1: authentication/roles (UAT-01), School Map read paths
(03), Geographic Intelligence, Budget views (05, 06).
Week 2: Tenders lifecycle end-to-end (07, 08), Certificates
valuation + separation-of-duties refusal (10, 11), Estimates (12),
Real Estate decree gate (13).
Week 3: Migration Center with a qualified pilot batch (16–18),
full Arabic workflow (19), error recovery (20), Reports (14),
Administration incl. the pilot panel (15).

## Evidence capture
Each executed scenario records: executor, date, actual outcome,
screenshot or report reference, and the customer reviewer's
sign-off in the sheet's columns. Migration scenarios attach the
batch's reconciliation package.

## Defect severity rules
S1 — data integrity, security, or money figures wrong: stop the
affected module's testing, same-day escalation. S2 — workflow
blocked, no workaround. S3 — workflow works with a workaround.
S4 — cosmetic. All defects enter the register with reproduction
steps and environment.

## Retest process
A fix ships → the defect's scenario is re-executed by the
original tester where possible → the retest is a NEW entry (the
failed run stays in the record) → UAT Lead closes the defect.

## Sign-off and exceptions
Per-module sign-off by the GAEB reviewer; exceptions (accepted
deviations) are recorded in writing with an owner and a date —
an exception is a decision, not a silent pass.

## Pilot-day runbook (first UAT day)
09:00 access check for all testers → 09:30 UAT-01 as a group →
10:00 module tracks begin → 15:00 defect triage with the delivery
team → 16:30 day summary into the sheet. Daily rhythm repeats;
the pilot board reviews the sheet weekly.
