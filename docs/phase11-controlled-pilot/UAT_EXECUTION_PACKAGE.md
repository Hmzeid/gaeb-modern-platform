# Phase 11 — UAT Execution Framework (Workstream H)

## Artifacts
- `UAT_EXECUTION_SHEET.csv` — 20 scenarios (UAT-01…UAT-20)
  covering authentication/roles, School Map, Geographic
  Intelligence, Budget (incl. the finance-hiding case), Tenders
  (lifecycle + skip refusal), Certificates (valuation +
  separation-of-duties refusal), Estimates, Real Estate (decree
  gate), Reports, Administration, Migration Center (reconciliation
  reading, rejects, approve/revoke), a full Arabic workflow, and
  error recovery. Every row carries the full execution record
  fields and starts at **NOT RUN**.
- `UAT_DEFECT_REGISTER.csv` — the defect log template (severity,
  reproduction, expected/actual, assignment, verification, closure).

## Internal synthetic rehearsal (executed — NOT customer UAT)
The behaviors the UAT scenarios assert are already exercised by
the automated suites on synthetic data; mapping for the reviewer:

| UAT area | Internal evidence |
|---|---|
| Auth & roles (01, 06, 15) | Backend integration suite (401/403, finance gating); E2E role checks |
| School Map paging/search (03) | Integration pagination assertions; scale runs; E2E |
| Tender lifecycle + skip refusal (07, 08) | Workflow machine tests; E2E create/advance flow |
| Certificate valuation + SoD (10, 11) | Money/workflow suites (exact decimals; certifier≠authorizer) |
| Decree gate (13) | Workflow suite (REMV gate) |
| Migration Center (16–18, 20) | Phase 11 rehearsal R-01…R-12 through the real APIs |
| Arabic workflow (19) | E2E Arabic checks; AR visual baselines; i18n parity tests |

This mapping exists so GAEB reviewers can see the internal state
honestly. **It does not advance any UAT row**: customer UAT begins
when named GAEB users execute the sheet (or formally witness and
approve specific cases), and only their recorded results count.

## Execution rules
Entry: charter entry conditions met; pilot data qualified.
Each case records executor, date, actual outcome, evidence
reference, and the customer reviewer's sign-off. Failures enter
the defect register; a case is re-run after its fix, and the
re-run is a new row entry, not an edit of history. Exit: the
Phase 10 §07 criteria (all critical-path cases pass; remaining
failures triaged as defect / BD-pending / training).
