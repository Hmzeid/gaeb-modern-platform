# Phase 9 — Baseline Verification

Directive §2 requires the baseline to be confirmed before any change.
All checks were executed on 2026-11-13 before the Phase 9 branch was
created. **No discrepancy was found.**

## Repository state
- Branch `ux-redesign` HEAD: `0c6c8a1e73fd8aa76faee2b44ad6f9372bffe73e`
  ("UI certification evidence package…") — matches the directive's
  stated baseline exactly.
- PR #7: **OPEN**, head `ux-redesign@0c6c8a1…` — unchanged.
- Phase 9 branch `phase-9-ui-release` was created from that commit.
  No unrelated PR was modified or merged.

## Test baselines reproduced (pre-change)
| Suite | Command | Certified claim | Reproduced |
|---|---|---|---|
| Backend integration | `TEST_DATABASE_URL=postgres://gaeb@127.0.0.1:54399/gaeb_test npm test` (in `platform/`) | 65 pass / 0 skipped | **65 pass / 0 fail / 0 skipped** |
| Frontend unit/component | `npm test` (in `platform/frontend`) | 27 pass | **27 pass (4 files)** |
| Browser E2E | `node e2e/run.mjs` with `CHROME_PATH` set | 25/25 | **25/25** |

## Environment of record
- Node v24.22.1 · PostgreSQL 16.4 (embedded, port 54399) ·
  Chrome Headless Shell 157.0.8103.78 · databases `gaeb_test`
  (suite) and `gaeb_docs` (synthetic demo instance, users
  admin/operator/approver) · API on 18090, frontend preview on 5173.
- The certification evidence in `docs/ui-certification/` (audit and
  final screenshot matrices, 9 documents) was left untouched, as
  required. Phase 9 evidence lives in `docs/phase9-ui-release/`.
