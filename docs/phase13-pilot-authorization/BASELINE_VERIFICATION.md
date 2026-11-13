# Phase 13 — Baseline Verification

Verified 2026-11-13 before any Phase 13 change:
- HEAD of `phase-12-pilot-activation`: `d3fe7c3` — matches the
  reported baseline exactly.
- PR #11: OPEN, `phase-12-pilot-activation` →
  `phase-11-controlled-pilot` (ancestry as reported).
- Suites reproduced on Node v24.22.1 / PostgreSQL 16.4 (sandbox):
  backend **65/65** (`TEST_DATABASE_URL=…/gaeb_test npm test`),
  frontend **32/32** (`npm test`), browser E2E **40/40**
  (`node e2e/run.mjs`), visual **31/31** (`node e2e/visual.mjs`),
  synthetic rehearsal **28/28** (`tools/phase11-rehearsal.mjs`).
- No discrepancy. Branch `phase-13-pilot-authorization` created
  from the verified head. Sandbox note: PostgreSQL and the psql
  client were restarted/reinstalled once during the phase after a
  VM replacement (standing sandbox behavior); no data or results
  were affected.
