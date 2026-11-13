# Screen-by-Screen Visual Audit — GAEB Enterprise UI Certification

Method: the production application (backend + PostgreSQL + built
frontend) was run against the synthetic `gaeb_docs` demonstration
instance and every route was captured at 1920×1080, 1440×900, 1024×768
and 390×844, in English and Arabic — 88 audit screenshots in
`screenshots-audit/`. Findings were recorded, corrected where in scope,
and re-verified (final matrix in `screenshots-final/`, interaction
evidence in `verification/`).

Severity scale: Critical (blocks use or misstates data) · Major
(materially degrades a workflow or audience) · Minor (polish).

## Findings register

### F-01 — Mobile shell unusable — Major — FIXED
- Screen: all (390×844). Evidence: `screenshots-audit/overview-en-mobile.png`.
- Description: the 224px rail consumed over half the viewport; content
  was clipped horizontally; tabs wrapped into a vertical stack.
- Root cause: the shell grid and rail were fixed-width with no
  responsive behavior.
- Correction: responsive shell in `theme.css` — at ≤900px the rail
  becomes a top strip with a horizontally scrolling nav, cards span
  full width, the geo grid stacks, drawers go full-width; at ≤640px
  KPI cards and form fields go full/half width; overview tabs scroll
  horizontally instead of wrapping.
- Verification: `screenshots-final/overview-en-mobile.png`,
  `verification/v-overview-mobile.png`, `v-map-mobile.png`.

### F-02 — Geographic view was a schematic plot — Major — FIXED
- Screen: Geographic Intelligence. Evidence:
  `screenshots-audit/geo-en-desktop.png`.
- Description: governorate bubbles on a hand-drawn outline; not
  defensible as geographic intelligence for a government audience.
- Correction: real choropleth on OCHA COD-AB boundaries (CC BY-IGO)
  joined by an explicit GAEB-code → P-code table; selection panel,
  hover, zoom, School Map drill-through. See
  `VISUAL_ACCEPTANCE_REPORT.md` §Geographic data.
- Verification: `verification/v-geo-desktop.png`, `v-geo-selected.png`,
  `screenshots-final/geo-*-*.png`, unit tests in
  `platform/frontend/src/geo-data.test.ts`.

### F-03 — Coverage denominator wrong — Minor — FIXED
- Screen: Geographic Intelligence header chip read "Governorates
  covered: 4 / 4" because the denominator was the number of rows in
  the demo reference table, not the number of governorates.
- Correction: denominator is the boundary dataset's region count (27).
  Verified "4 / 27" in final screenshots.

### F-04 — Certificate drawer had no substance — Major — FIXED
- Screen: Payment Certificates.
- Description: the drawer showed header totals only — no item lines,
  no building context — while the API stored valued lines per
  certificate. The list also lacked the building column.
- Correction: additive `GET /api/certificates/:id` (header + building
  + items), building column in the list, item-lines table in the
  drawer. Covered by integration assertions with exact-decimal checks.
- Verification: `verification/v-certificate-drawer.png`.

### F-05 — Estimates were opaque; a decorative stepper misled — Major — FIXED
- Screen: Estimates & BOQ.
- Description: no way to see an estimate's catalogue lines or its
  revision history; a static stage stepper pinned to "draft" sat under
  the table regardless of the selected record (decorative UI implying
  state that was not the record's).
- Correction: additive `GET /api/estimates/:id` (items + revisions);
  rows open a drawer with the record's own stepper, item lines and
  revision history; the static stepper was removed.
- Verification: `verification/v-estimate-drawer.png`.

### F-06 — Tender drawer lacked stage history — Minor — FIXED (admin)
- Screen: Tenders & Contracts.
- Correction: the drawer now lists the tender's audit-trail entries
  (transitions with actor) when the caller may read the audit log
  (admin). For other roles the section is absent — the audit endpoint
  is admin-only by design, and the UI does not fabricate history.

### F-07 — School Map grid could not sort or page — Minor — FIXED
- Screen: School Map.
- Correction: sortable name/governorate/id columns and 25-row client
  pagination over the loaded result set. The 200-row API cap remains
  (see residual R-C-3).

### F-08 — Money formatter silently rounded fractions — Critical — FIXED
- Component: `fmtMoney` (all money displays).
- Description: fraction digits were routed through `Number` + Intl
  with a default 3-fraction-digit cap, so a stored value like
  `0.0001` rendered as `0.` and any 4-decimal value was re-rounded —
  contradicting the platform's exact-decimal rule at the display layer.
- Root cause found by: the new Vitest suite (`format.test.ts`).
- Correction: fraction digits are localized character-by-character;
  integer grouping still uses BigInt. Tests assert exact preservation
  including a beyond-float53 integer.

### F-09 — Eight Arabic stage labels missing — Major — FIXED
- Component: i18n dictionaries / Migration Center intake.
- Description: intake stages (received…reconciled) and the final
  "accepted" stage had no `st_*` labels; Arabic users saw humanized
  English fallbacks. Found by the dictionary-parity test.
- Correction: labels added in both languages; EN/AR key parity is now
  enforced by an automated test (242 keys each).

### F-10 — Color contrast below WCAG AA — Major — FIXED
- Screens: all (axe-core serious violations: 27 nodes overview,
  26 migration, 5 school map).
- Root causes: muted text token `#8494ad` at 3.07:1; white on brand
  teal buttons at 3.3:1; white on danger buttons at 3.96:1; status
  chip text (ok 3.04:1, bad 3.37:1).
- Correction: ink3 darkened to `#5b6b84` (~5.0:1), teal buttons to
  `#0b7a68`, danger buttons to `#bc3433`, chip text ok `#146c3c` /
  bad `#a92c28`. Re-scan: zero critical/serious violations on
  overview, school map, migration, geo.
- Evidence: `ACCESSIBILITY_REPORT.md`; E2E axe section.

### F-11 — Heading structure incomplete — Minor — FIXED (mostly)
- Description: no `h1` anywhere; GeoView panel titles used `h4`
  directly under `h2`.
- Correction: visually-hidden `h1` in the shell; geo panel titles are
  `h3`. One moderate axe "heading-order" node remains (panel `h3`s in
  module views precede any `h2` because module views have no page
  title heading) — recorded in `ACCESSIBILITY_REPORT.md`.

### F-12 — Approvals register hid revoked state — Major — FIXED
- Screen: Migration Center.
- Description: `GET /api/migration/approvals` did not return `mode` or
  `status`, so revoked approvals displayed identically to active ones
  (and an earlier UI attempt to render status crashed the view — see
  the Concept D implementation notes).
- Correction: the endpoint now returns `mode` and `status` (additive);
  the register shows both, and Revoke renders only for active rows.
  The hardened StatusChip + ErrorBoundary remain as defense in depth.

### F-13 — Untranslated operator strings in Migration Center — Minor — FIXED
- Description: inventory coverage counts, intake stage names, job
  states, and the live-monitor "checkpoint / keys" labels rendered as
  raw English enum keys in the Arabic UI.
- Correction: all mapped through the `st_*` label system; job-state
  and inventory-status labels added in both languages.
- Residual: the import-result toast message remains an English
  operator string (R-C-4).

### F-14 — ECharts inflated the entry bundle — Major — FIXED
- Description: the chart library was statically imported by a shared
  component, putting ~1.1 MB in the entry chunk despite lazy views.
- Correction: the Chart component now dynamic-imports ECharts on
  first mount. Entry JS: 1,306 KB → 208 KB; ECharts is a separate
  on-demand chunk. See `PERFORMANCE_REPORT.md`.

### F-15 — Overview header dropdowns implied nonexistent filters — Minor — FIXED EARLIER
- The prototype-style "All Directorates / Fiscal Year" selects had no
  filtering semantics; converted to static context labels during the
  Concept D build (verified in this audit's screenshots).

## Per-screen notes (post-correction state)

- **Portfolio Overview**: KPIs trace to `/api/overview` (definitions in
  `VISUAL_ACCEPTANCE_REPORT.md`); donut and stage tiles drill into
  their modules; money shows an em-dash unavailable state for roles
  without `reports.finance` (verified in E2E with the technical role).
- **Geographic Intelligence**: see F-02/F-03.
- **School Map**: search, governorate filter (deep-linkable from the
  geo view), sort, pagination, record drawer with Arabic names
  preserved verbatim from the API.
- **Budget**: allocations with utilization bars and exact money;
  variance beyond allocated/committed/spent is not presented because
  the Budget operational model remains blocked on B-01 evidence —
  the UI does not invent variance semantics.
- **Tenders**: 12-stage machine enforced by the API; drawer stepper +
  history (F-06).
- **Certificates**: F-04; separation of duties is enforced server-side
  (certifier ≠ payment authorizer) and the UI surfaces the API's 422
  verbatim via toast.
- **Estimates**: F-05; catalogue-only rule enforced server-side.
- **Real Estate**: decree-gated transitions preserved; compensation
  shown only when recorded.
- **Reports**: finance-gated (403 state is a designed empty state);
  CSV export uses the authenticated download path.
- **Migration Center**: all pre-redesign capabilities retained
  (verified view-by-view in E2E); F-12/F-13 corrections applied.
- **Administration**: session card, user directory (new, admin-only
  endpoint, no password material), audit trail with a designed denied
  state for non-admin roles.
