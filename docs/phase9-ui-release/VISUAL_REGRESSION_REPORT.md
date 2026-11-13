# Phase 9 — Visual Regression Report (R-C-2)

## Framework
`platform/frontend/e2e/visual.mjs` — puppeteer-core driving the same
headless Chrome as the E2E suite; `pixelmatch` for comparison with a
per-pixel color threshold of 0.12 and a frame budget of **0.5%
differing pixels**. The directive's preference for Playwright was
weighed: the repository's browser automation is standardized on
puppeteer-core with a vendored Chrome build (the sandbox cannot
download Playwright browsers from a CDN), so the harness implements
the same controls — deterministic fixtures, fixed viewports,
animation suppression, thresholds, diff artifacts — on the existing
stack rather than adding a second browser toolchain.

## Coverage (31 shots)
- All 11 views × EN desktop (1440×900) and AR desktop
- Tablet (1024×768): overview, geo, map, migration (EN); overview,
  migration (AR)
- Mobile (390×844): overview, map, migration (EN)
Baselines: `platform/frontend/e2e/baselines/*.png`.

## Determinism controls
Fixed viewports; `animation/transition: none` injected; network-idle
+ settle waits; the seeded synthetic demo dataset. Proof of
determinism: a full repeat run on the final build scored **0.00%
difference on all 31 shots**.

## Baseline review process (the control that matters)
- Compare mode never writes baselines.
- A failing shot writes `<name>.diff.png` and `<name>.current.png`
  to `e2e/visual-diffs/` for human review.
- Intentional design changes are adopted only by a deliberate
  `--update` run; data-driven diffs (the demo dataset grows when the
  E2E suite creates records) are reviewed the same way and are the
  expected, visible cost of testing against a living demo instance.
- During Phase 9 the process worked as designed: the mobile rail
  containment fix and the badge-semantics fix each produced reviewed
  baseline updates, recorded in `RESIDUAL_CLOSURE.md` and
  `DESIGN_QUALITY_REVIEW.md`.

## Result
**31/31 PASS** on the final Phase 9 build (after the reviewed
baseline updates above).
