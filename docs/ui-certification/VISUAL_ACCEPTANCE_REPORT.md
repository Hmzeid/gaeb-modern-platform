# Visual Acceptance Report — GAEB Enterprise UI Certification

Date: 2026-11-13 · Branch: `ux-redesign` · Baseline: Concept D build
Evidence root: `docs/ui-certification/` (audit matrix, final matrix,
targeted verification captures). All screenshots are from the actual
running application against the synthetic `gaeb_docs` demonstration
instance. No screenshot is a mockup; no figure is customer data.

## Executive summary

The Concept D redesign was audited screen by screen (88 captures),
corrected where the audit found real defects, and re-verified with
three independent suites: backend integration **65/65**, frontend
unit/component **27/27**, browser E2E **25/25** with zero uncaught
page errors and zero critical/serious axe violations on the scanned
views. Fifteen findings were recorded; all fifteen are corrected.
The geographic view is now a real choropleth on licensed boundary
data. The certification is recommended **accepted with the residuals
listed below** — none of which is a visual or functional defect in a
shipped workflow.

## Acceptance gates (directive §14)

| # | Gate | Verdict | Evidence |
|---|---|---|---|
| 1 | Every major module visually reviewed | **Pass** | `screenshots-audit/` + `SCREEN_BY_SCREEN_AUDIT.md` |
| 2 | Critical visual defects resolved | **Pass** | F-01…F-15 register — all FIXED |
| 3 | Every major module works EN + AR | **Pass** | `screenshots-final/` (44 AR shots) + `ARABIC_RTL_MATRIX.md` |
| 4 | Automated frontend tests execute successfully | **Pass** | Vitest 27/27 (`FRONTEND_TEST_REPORT.md`) |
| 5 | Critical E2E workflows pass | **Pass** | Browser E2E 25/25 (login, tender create+advance, certificate create, approval create+revoke, RTL, role gating) |
| 6 | Browser console errors resolved | **Pass** | E2E asserts zero uncaught page errors across the full run |
| 7 | Accessibility defects assessed; critical corrected | **Pass with residuals** | axe 0 critical/serious on 4 views; moderate residuals R-A-1/R-A-2 documented |
| 8 | Finance authorization verified server-side | **Pass** | `SECURITY_VERIFICATION.md` — payload-level gating + 401/403 negatives in the suite |
| 9 | Geographic visualization uses defensible data | **Pass** | OCHA COD-AB (CC BY-IGO); provenance below |
| 10 | Migration Center retains all capabilities | **Pass** | View-by-view E2E + suite; approvals UX extended (F-12), nothing removed |
| 11 | Backend suite remains green | **Pass** | 65 pass / 0 skipped / 0 fail (with `TEST_DATABASE_URL`) |
| 12 | Screenshots reflect the implemented UI | **Pass** | Final matrix captured after the last build |
| 13 | No critical functionality replaced with placeholders | **Pass** | The one decorative element found (F-05 static stepper) was removed, not kept |
| 14 | Complete acceptance evidence package produced | **Pass** | This folder: 9 documents + 176 matrix screenshots + verification captures |

## Executive dashboard assessment

`GET /api/overview` is the single source for the Portfolio Overview.
KPI definitions (all computed from live tables, role-gated as noted):

- Registered buildings / by governorate — `app.buildings` counts;
  governorate distribution from `GET /api/reports/buildings-by-governorate`.
- Tenders by stage — counts over the 12-stage machine.
- Certificates by status — counts only; **money appears only when
  the caller holds `reports.finance`** (gross/net/paid aggregates);
  otherwise the payload carries `money: null` and the UI shows the
  unavailable state.
- Queues requiring action — draft certificates, draft estimates,
  active mapping approvals, quarantined migration records.
- Drill-downs: donut segments open Certificates filtered by status;
  stage tiles open Tenders; queue rows open their workflows.

No number on the dashboard is hard-coded or sampled from demo data in
the client; every figure traces to an endpoint above.

## Geographic data provenance

- Dataset: **Egypt — Subnational Administrative Boundaries (COD-AB)**,
  OCHA Field Information Services Section, via the Humanitarian Data
  Exchange. License: **CC BY-IGO**. Attribution is rendered in the UI
  in both languages.
- ADM1 layer: 27 governorate features with EN/AR names and P-codes.
  The asset shipped to the browser is a Douglas-Peucker simplification
  (0.006° tolerance, 4-dp rounding): 3,946 points, 76 KB.
- Join integrity: GAEB legacy governorate codes equal the OCHA
  P-code numeric part for 26 of 27 governorates; the single exception
  (Luxor, GAEB 36 → EG29) is explicit in `GOV_PCODE` in
  `platform/frontend/src/geo-data.ts` and locked by unit tests.
- Honesty rule honored: the database holds governorate-level data
  only, so the view is a governorate choropleth with aggregated
  counts — no building-level pins were invented.

## Before / after pairs (same route, language, viewport)

| Screen | Before | After |
|---|---|---|
| Overview (mobile) | `screenshots-audit/overview-en-mobile.png` | `screenshots-final/overview-en-mobile.png` |
| Geographic Intelligence | `screenshots-audit/geo-en-desktop.png` | `screenshots-final/geo-en-desktop.png` |
| Certificates | `screenshots-audit/certificates-en-desktop.png` | `screenshots-final/certificates-en-desktop.png` |
| Estimates | `screenshots-audit/estimates-en-desktop.png` | `screenshots-final/estimates-en-desktop.png` |
| Migration Center | `screenshots-audit/migration-en-desktop.png` | `screenshots-final/migration-en-desktop.png` |
| Overview (Arabic) | `screenshots-audit/overview-ar-desktop.png` | `screenshots-final/overview-ar-desktop.png` |

Targeted workflow evidence: `verification/` (geo selection panel,
certificate drawer with item lines, tender drawer with history,
estimate drawer, admin user directory, mobile shell).

## Residuals (accepted, tracked)

- **R-C-1** Drawer focus is not trapped and does not return focus to
  the opener; adopt Radix Dialog if drawers grow into wizards.
- **R-C-2** No automated pixel-diff visual regression; two filed
  matrices + targeted captures are the current mechanism.
- **R-C-3** School Map operates over the API's ≤200-row page; a
  server-side grid decision is deferred until real volumes arrive.
- **R-C-4** The migration import-result toast is an English operator
  string in the Arabic UI.
- **R-C-5** ECharts (~1.1 MB) loads on first chart view; acceptable
  for an internal console, revisit for constrained networks.
- **R-A-1/R-A-2** axe moderate `heading-order` and `region` notices
  (see `ACCESSIBILITY_REPORT.md`); R-A-3 chart keyboard navigation;
  no NVDA/VoiceOver pass was possible in the sandbox.
- **Unchanged blockers (not UI):** GitHub `workflow` scope still
  blocks CI/Docker execution and branch protection; the staged
  frontend CI job is ready. Docker remains **NOT VERIFIED**. Business
  equivalence BD-01…BD-08, customer UAT, security approval, and
  production authorization are unchanged by this certification.

## Recommendation

**Accept the UI certification with the residuals above.** The
application now presents as one coherent bilingual enterprise
product: executive intelligence with traceable figures, a defensible
geographic view, operational modules whose drawers carry real record
substance, a Migration Center that exposes approval state honestly,
and an automated test floor that has already caught three real
defects. Final acceptance of the redesign as a whole remains the
product owner's decision.
