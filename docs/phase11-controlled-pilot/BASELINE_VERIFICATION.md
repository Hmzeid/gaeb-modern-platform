# Phase 11 — Baseline Verification (Workstream A)

Executed 2026-11-13 before the Phase 11 branch was created.
**No discrepancy against the Phase 10 reference figures.**

- Repository HEAD (`phase-10-pilot-readiness`):
  `b370e9c2429d1520d6d2ecb7d48c6d6479783ec9` — matches the directive
  baseline exactly.
- PR #9: **OPEN**, `phase-10-pilot-readiness` → `phase-9-ui-release`.
  Ancestry preserved; nothing merged.
- Phase 11 branch `phase-11-controlled-pilot` created from that HEAD.

| Suite | Command | Reference | Actual |
|---|---|---|---|
| Backend | `TEST_DATABASE_URL=…/gaeb_test npm test` (platform/) | 65 pass | **65 pass / 0 fail / 0 skipped** |
| Frontend unit | `npm test` (platform/frontend) | 32 pass | **32 pass** |
| Browser E2E | `node e2e/run.mjs` | 40/40 | **40/40** |
| Visual regression | `node e2e/visual.mjs` | 31/31 | **31 pass / 0 fail** |

Backup/restore evidence from Phase 10 verified present
(`docs/phase10-pilot-package/evidence/backup-restore-rerun.md`,
dump hashes recorded), and re-executed against the Phase 11
rehearsal database during Workstream F (R-12).

Environment: Node v24.22.1 · PostgreSQL 16.4 · Chrome Headless
Shell 157.0.8103.78 · sandbox host (shared 1.5 vCPU) — performance
figures remain laboratory floors.
