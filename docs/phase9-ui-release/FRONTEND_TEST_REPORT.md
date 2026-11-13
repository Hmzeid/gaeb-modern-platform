# Phase 9 — Frontend Test Report (Workstream D)

All figures are from executed runs on the final Phase 9 build.

## Baselines → final
| Suite | Baseline (verified) | Final |
|---|---|---|
| Backend integration (`platform/`) | 65 pass / 0 skipped | **65 pass / 0 skipped / 0 fail** — the E2E test now also carries the pagination assertions (§below) |
| Frontend unit/component (Vitest) | 27 pass | **32 pass** |
| Browser E2E (puppeteer) | 25/25 | **40/40** |
| Visual regression (pixelmatch) | — (new) | **31/31, 0.00% diff on repeat** |

## What the expansion covers
**Unit/component (+5):** Drawer focus management — focus-in on open,
Tab wrap last→first, Shift+Tab wrap first→last, Escape close, dialog
semantics (role, aria-modal, aria-label). The existing 27 (money
exactness, StatusChip incl. the undefined-guard regression, i18n
parity — now **249 keys** — stage labels, geo join) all still pass.

**Backend integration (inside the existing E2E test):** paged
buildings — total matches the seeded register; pages advance without
overlap; desc ordering reverses; governorate filter exact; a `%`
search term returns 0 rows (wildcards escaped, proven behaviorally);
unauthenticated paged request returns 401.

**Browser E2E (+15 checks):** axe-core scans extended from 4 views
to **all 11** (final result: zero violations of any severity);
keyboard-only workflow (Tab reaches the Tenders rail link, Enter
navigates); drawer open → Escape close in the browser; Arabic
Migration Center workflow (RTL + localized content); tablet
(1024×768) Budget render; mobile (390×844) rail geometry **and the
new no-horizontal-overflow assertion**; the pre-existing flows
(tender create/advance, certificate create, approval create/revoke,
role money-gating, zero page errors) all still pass.

**Integration/API failure behavior:** the backend suite's existing
negative coverage stands (401/403 paths, finance gating); the paged
endpoint's 400s for malformed parameters are covered in
`SECURITY_VERIFICATION.md`.

## Commands
- Backend: `TEST_DATABASE_URL=postgres://gaeb@127.0.0.1:54399/gaeb_test npm test` in `platform/`
- Frontend: `npm test` in `platform/frontend`
- E2E: `CHROME_PATH=<chrome> node e2e/run.mjs` (results filed at `platform/frontend/e2e/e2e-results.json`)
- Visual: `CHROME_PATH=<chrome> node e2e/visual.mjs [--update]`

## Honest scope notes
- Chart rendering states are covered indirectly (E2E view renders +
  visual baselines include the chart views in both languages); there
  is no dedicated chart-unit harness.
- Error-boundary behavior is unit-tested at component level from the
  certification phase; a forced-crash browser test is not included.
