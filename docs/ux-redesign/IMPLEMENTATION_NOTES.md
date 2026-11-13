# Implementation Notes — Concept D Redesign (branch `ux-redesign`)

Built 2026-11-13 after the owner approved Concept D ("Yes — build the
redesign on Concept D"). The production frontend under
`platform/frontend/` was rebuilt in place; all backend APIs, RBAC and
workflows are unchanged except one additive endpoint.

## What shipped

- **Shell**: navy rail (grouped Executive / Operations / Governance,
  live count badges from `/api/overview`, user card), topbar with
  building search (routes to School Map filtered), language toggle,
  hash routing (`#/overview`, `#/geo`, `#/map`, …), redesigned login.
- **Portfolio Overview** (Concept D light): tabbed sections, KPI cards,
  certificates-by-status donut with priced legend, module-health
  segmented bars, all-12-stage tender tiles, budget-realization gauge,
  action queues, recent audit activity. Every figure binds to
  `/api/overview`, `/api/reports/buildings-by-governorate`,
  `/api/migration/metrics` or `/api/audit`.
- **Geographic Intelligence** (Concept D dark): governorate bubble plot
  on real coordinates with a schematic Egypt outline + Nile path,
  ranked governorates, attention items derived from real queues and
  quarantine counts, import-acceptance gauge.
- **Modules**: School Map (search + governorate filter + record
  drawer), Budget (utilization bars), Tenders (stage chips, record
  drawer with the 12-stage stepper), Certificates (formatted money,
  drawer with 5-stage stepper), Estimates & catalogue, Real Estate
  decree flow, Reports (charts + tables + CSV), Administration (audit).
- **Migration Center**: every pre-redesign function ported (inventory,
  preview, buffered import, live progress monitor, operations metrics,
  batches, rejects + resubmit, reconciliation, approvals, intake) and
  two API surfaces the old UI never exposed are now in the UI:
  approval **create/revoke** and **import jobs** (create/claim/
  transition) — same endpoints the backend suite exercises.
- **Design system**: Tailwind v4 token layer (`theme.css`), one
  `StatusChip` for every enum (single tone map), locale formatters
  (money grouping applied to the decimal string, never float-rounded),
  ECharts wrapper, drawer, toasts, skeletons, an app-level
  `ErrorBoundary` so one broken view cannot white-screen the shell.

## Backend change (additive only)

`GET /api/overview` — counts, tenders-by-stage, certificates-by-status,
action queues for every authenticated role; money aggregates included
only when the caller holds `reports.finance`. Covered by assertions
added inside the existing integration E2E test (suite size unchanged).

## Verification evidence

- Backend suite: **65/65 pass, 0 skipped, 0 fail** — run with
  `TEST_DATABASE_URL` set so the full integration E2E actually executes.
  (Two earlier runs in this session used `DATABASE_URL` by mistake and
  silently skipped the integration test at 64 pass / 1 skipped; the
  baseline stash comparison showed identical numbers, and the final run
  above is the valid one.)
- Live verification on the `gaeb_docs` demo instance: two defects were
  caught by running the real UI and fixed —
  1. `/api/overview` read `req.user` instead of `req.session` → 500 on
     every call (the integration assertions then caught the same class
     of error in CI-style runs once the env var was right).
  2. The approvals list endpoint returns no `status`/`mode` fields;
     the new approvals table crashed on the missing enum and blanked
     the app. Fixed by rendering only the fields the API returns,
     hardening `StatusChip` against missing values, and adding the
     `ErrorBoundary`.
- Screenshot matrix filed in `docs/ux-redesign/verification/`:
  overview EN + AR + tablet, geo EN, certificates EN, tenders EN,
  migration EN, reports EN — all against live API data.

## Deviations from DESIGN_SYSTEM.md (declared)

- Radix primitives and TanStack Table/Query were **not** adopted. The
  components are hand-built on the token layer (drawer with Esc +
  backdrop dismissal and focus outlines, native fetch state). User-
  facing behavior matches the design system spec; the deviation is
  implementation-internal and was taken to keep the dependency surface
  and bundle small. Revisit if table complexity grows.
- Tailwind is used as the token/theme layer; most component styling is
  CSS classes in `theme.css` (ported from the approved Concept D
  prototype) rather than utility classes in JSX.

## Residual register

- **R-UX-1** Frontend component/unit tests were not added (criterion 7
  not met). Verification rests on the backend suite, the TypeScript
  build, and live browser checks.
- **R-UX-2** Full click-through browser E2E of every governed action
  (create/advance/transform/resubmit/export) was not executed; actions
  are reachable in the UI and the same endpoints are covered by the
  backend integration suite.
- **R-UX-3** Screenshot matrix is partial: Budget, Estimates, Real
  Estate and Admin screens, and Arabic renders of the module screens,
  were not captured. No layout defects are known in them (same
  components), but they are unverified visually.
- **R-UX-4** ECharts ships as one lazy chunk (~1 MB). Acceptable for an
  internal government console; modular `echarts/core` imports would
  trim it.
- **R-UX-5** The geo plot remains schematic (outline + bubbles); an
  official Egypt GeoJSON boundary set is still to be bound.
- **R-UX-6** In Arabic, the ECharts gauge detail uses Western digits
  (`0%`) while the rest of the UI uses Arabic-Indic numerals.
- **R-UX-7** The buildings list endpoint caps at 200 rows; the School
  Map search/filter operates on the loaded page of results.
- **R-UX-8** Keyboard-only completion of the governed flows was not
  formally tested (criterion 6 partial): focus styles, aria labels,
  `aria-live` regions and Esc handling are in place by construction.
