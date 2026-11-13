# 07 — Customer UAT Package

Status: **PREPARED — NOT RUN.** No UAT case has been executed by
GAEB participants; no participants are named yet (B-12). The pack
below consolidates the Phase 6 execution pack (30 cases) and the
Phase 7 pack, and adds the Phase 9/10 UI-era cases. Every case
carries preconditions, steps, the expected result, and a
pass/fail/evidence row for the executor — nothing is pre-filled.

## Scenario coverage by module
- **School Map:** registry search (EN + AR names, legacy code),
  governorate filtering, deep paging, building detail review,
  geographic coverage reading. *(Includes the server-pagination
  behavior new in Phase 9/10.)*
- **Budget:** allocation entry, execution recording, finance report
  visibility by role (a non-finance role must NOT see figures).
- **Purchases & Contracts:** full tender lifecycle walk (all 12
  stages), stage-skip attempt (must refuse), stage filter + search,
  deadline warning observation (BD-06 caveat printed on the case).
- **Technical Abstracts:** certificate creation with item lines,
  valuation check qty × price, deduction application (BD-04 caveat),
  certification → billing → payment authorization with the
  separation-of-duties refusal case.
- **Estimates:** draft creation, item selection, revision history.
- **Real Estate:** case registration, decree-gate refusal case
  (REVM02 before decree must refuse), decree recording, progression.
- **Migration Center (pilot data only):** preflight verdict reading,
  batch reconciliation report reading, rejects review, approval
  grant/revoke with the self-approval refusal case.
- **Cross-cutting:** Arabic full-workflow pass (one complete
  workflow executed entirely in Arabic), role-based access matrix
  spot checks, audit-log verification of the actions taken,
  accessibility spot checks (keyboard-only completion of one
  workflow) — full assistive-technology validation is the separate
  external pack (`ACCESSIBILITY_EXTERNAL_VALIDATION.md`).

## Execution mechanics
- Environment: the pilot environment (§02) with synthetic data for
  dry-runs; customer-data cases run only after §05 qualification.
- Each case: executor name, date, result, evidence reference
  (screenshot/report ID) recorded in the results sheet
  (`docs/uat/GAEB_Phase6_UAT_Results.csv` format).
- Entry criteria: pilot environment smoke-verified; participant
  accounts issued; BD caveats printed on affected cases.
- Exit criteria: all critical-path cases pass; failures triaged as
  defect vs decision-pending (BD) vs training; the **Customer
  Acceptance Form is signed by GAEB** — the form exists and is
  unsigned; this package does not change that.
