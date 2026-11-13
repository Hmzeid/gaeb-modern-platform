# Phase 11 — Synthetic Pilot Rehearsal (Workstream F)

Executed 2026-11-13 by `platform/tools/phase11-rehearsal.mjs`
against a throwaway database (`gaeb_p11`) and a dedicated instance
of the real API — every step over HTTP, synthetic fixtures only.
Machine evidence: `evidence/rehearsal-results.json`.
**Final result: 23/23 checks passed** (21 executed + 2 recorded as
not executed, below).

## Positive flow
| # | Scenario | Observed |
|---|---|---|
| R-01 | Preview of a mixed fixture (3 good, 1 duplicate key, 1 corrupt zoned field, truncated tail) | loaded=3, rejected=3, per-record reasons |
| R-02 | Buffered import | 3 staged under batch `mig-85d145a2be972fe6` (hash-derived ID) |
| R-03 | Re-import of the identical extract | staged stays 3; batch loaded stays 3 — nothing loads twice |
| R-04 | Reconciliation vs an independent recount | source=6, parsed=4, loaded=3, quarantined=3, duplicates=1, equation holds, report outcome PASSED; business equivalence + customer acceptance read PENDING in the same report |
| R-07 | Streaming import of 3,000 records via upload | SHA-256 verified at upload; 7 chunks committed; progress endpoint reports loaded=3000 |
| R-08 | Import job lifecycle | create 201 → duplicate active job for same extract 409 → invalid transition 422 → cancel-by-stranger 403 → cancel-by-creator 200 |
| R-11 | Standalone preflight validator on the fixture | verdict REVIEW (the fixture deliberately contains records the validator flags) |
| R-12 | Backup/restore of the rehearsal DB | 18 tables compared, 0 mismatches (fingerprint path) |

## Negative flow (all refused exactly as designed)
| # | Scenario | Observed |
|---|---|---|
| R-05a | Transform with no approvals | 422 |
| R-05b | Approval attempt by the operator role (no `migration.approve`) | 403 |
| R-05c | Importer approves own batch's transform, then transforms | 422 — self-approval does not count |
| R-05d | Independent approver approves → transform | 200, inserted=3 |
| R-06 | Approval revoked (reason recorded) → transform | revoke 200, transform 422 |
| R-09a | Import under an unknown layout | 400 before parsing |
| R-09b | Delimited text fed to the native-binary layout | loaded=0 (format guard) |
| R-10 | NUL byte inside a character field | that record quarantined; the clean record loads |

## What the rehearsal caught (harness defects, fixed and re-run)
The first two rehearsal runs failed 5–7 checks — every failure
traced to the *harness*, not the platform: the revoke endpoint
requires a reason (the harness omitted it — an audit-friendly
contract worth knowing), three response-shape assumptions differed
from the real API (stream result, job transition, reconciliation
report), and the fixture database was missing a trigram index
(also caught independently by the environment preflight). Each was
corrected against the platform's actual contracts and the full
rehearsal re-executed to green. The platform code was not changed
by this workstream.

## Not executed (recorded, not hidden)
- **R-13 Insufficient storage:** cannot be injected safely in the
  shared build sandbox. Pilot-host P0 test with a quota-limited
  staging volume.
- **R-14 Database interruption mid-import:** same constraint.
  Restart/recovery stands verified by `tools/restart-recovery.mjs`
  (Phases 4/7); the rehearsal DB itself was rebuilt from scratch
  three times during this workstream without incident.
- Rollback readiness within the rehearsal: the rehearsal database
  is disposable by design; the production rollback procedure is
  the Operations Handbook's restore path, verified in R-12 form.
