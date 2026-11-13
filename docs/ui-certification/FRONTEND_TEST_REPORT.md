# Frontend Test Report — UI Certification

All results below were produced by executed commands in this
certification session; outputs are quoted, not paraphrased.

## Unit / component tests — Vitest 3.2 + Testing Library (jsdom)

Command: `npm test` in `platform/frontend`.
Result: **Test Files 4 passed (4) · Tests 27 passed (27)**.

| File | Covers |
|---|---|
| `src/format.test.ts` (9) | Exact-decimal money incl. the >3-fraction-digit regression (F-08) and a beyond-float53 integer; Arabic-Indic digit rendering; short forms; percent zero-guard |
| `src/components.test.tsx` (10) | StatusChip tones, unknown-status humanization, **undefined-value crash regression**, StageStepper states, SegBar share + zero-total guard |
| `src/i18n.test.ts` (5) | EN/AR key parity (242 keys), no empty values, every workflow stage (tender/certificate/intake) labeled in both languages (F-09), `statusTone` mapping for every key status |
| `src/geo-data.test.ts` (7) | 27 boundary features, P-code uniqueness, GAEB→P-code table completeness (27 codes), every mapped P-code exists in the asset, zero-padding + Luxor exception, anchor spot-checks |

The suite already earned its keep three times during the
certification: it caught the money-formatting defect (F-08), the
missing Arabic stage labels (F-09), and a corrupted dictionary edit
(key-parity failure) before any of them shipped.

## Browser E2E — puppeteer-core + headless Chrome, real stack

Script: `platform/frontend/e2e/run.mjs` (results filed at
`e2e/e2e-results.json`). Runs against the live API + PostgreSQL +
built frontend with the synthetic demo users.
Result: **25/25 checks passed**, including:

- Login and shell render; all 11 views render with no
  ErrorBoundary fallback
- Tender created through the UI and advanced draft → booklet
- Certificate created through the UI (row count 5 → 6)
- Migration approval created for the tenders transform and revoked
  through the UI (exercises the new `mode`/`status` contract, F-12)
- Language switch to Arabic: `dir=rtl` + localized chrome
- Role behavior: the technical role's overview contains **no EGP
  money figures** (unavailable state shown)
- axe-core scans (overview / school map / migration / geo): no
  critical or serious violations
- **Zero uncaught page errors across the entire run**

Environment variables: `CHROME_PATH` (required — points at any
Chrome/Chromium build), `GAEB_WEB_URL`, `E2E_PASSWORD`, `AXE_PATH`
(axe is resolved from the local tooling path by default; vendor
`axe-core` as a devDependency before enabling this suite in CI).

## Backend suite (regression guard for this certification)

Command: `npm test` in `platform/` with `TEST_DATABASE_URL` set.
Result: **65 pass / 0 skipped / 0 fail** — including the new
assertions for the three additive endpoints and the authorization
negatives (see `SECURITY_VERIFICATION.md`).

## Visual regression — honest scope

There is **no automated pixel-diffing**. What exists: two complete,
deterministic screenshot matrices of the running application —
`screenshots-audit/` (before) and `screenshots-final/` (after), same
routes, languages, and viewports — plus targeted `verification/`
captures of corrected workflows. Differences were reviewed by eye in
this certification. Automated visual diffing is recommended as a
follow-up once CI can run browsers (R-C-2).

## CI readiness

`ci/ci.yml` gained a `frontend-tests` job (install → build →
`npm test`). It is **staged, not active**: the repository's workflow
permission blocker (see Phase 8 GitHub audit) prevents pushing
`.github/workflows/`. No CI execution is claimed.
