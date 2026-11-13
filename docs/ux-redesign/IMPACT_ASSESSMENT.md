# Implementation Impact Assessment

## What does not change
- **Zero backend changes are required** for the redesign itself. All 47 API
  routes, RBAC, workflows, migration controls, approvals and reconciliation
  keep their contracts. Two small *additive* endpoints are recommended
  (`/api/overview`, approvals count) — new routes, no modifications.
- The 65-test backend suite is unaffected and remains the regression gate.
- The Migration Center's Phase 8 live monitor logic carries over; only its
  presentation is rebuilt.

## What is replaced
- `platform/frontend` is rebuilt in place: `App.tsx` (246 lines, single
  component) becomes a routed application (`src/app`, `src/components`,
  `src/modules/*`, `src/i18n`). The current UI has no reusable components
  worth salvaging beyond its API client and its EN/AR string approach.
- New frontend dependencies: Tailwind, Radix primitives, TanStack Table +
  Query, ECharts, Lucide. All MIT/Apache, all compatible with the existing
  Vite build; bundle grows (ECharts is the big one — loaded per-route with
  code splitting so module pages don't pay for dashboard charts).

## Effort shape (relative, not a schedule promise)
- Design system + shell: the foundation phase; everything else is assembly.
- Dashboards: medium — data exists; the work is drill-down wiring.
- Module workspaces: the bulk — nine workspaces, each table + drawer +
  actions against existing endpoints.
- Migration Center re-skin: small-medium — function exists and is tested.
- Verification: a dedicated phase (frontend tests, browser E2E, a11y,
  EN/AR + tablet screenshot matrix) — not an afterthought.

## Risks
1. **ECharts in RTL** — no native RTL mode. Mitigated by the chart wrapper;
   two rough edges already visible in the concepts (funnel labels, axis
   collisions) and budgeted in UX-2.
2. **Scope creep toward new backend features** — the plan binds every widget
   to an existing endpoint or the two named additions; anything else goes
   through the blockers process (B-register), not silent invention.
3. **Arabic copy quality** — UI strings must be reviewed as native Arabic,
   not translated labels; the concepts use hand-written Arabic for exactly
   this reason.
4. **Demo-data confusion** — concepts carry synthetic figures. The final
   build has no demo dataset in production paths; demo mode stays the
   existing labeled seed.
5. **Regression risk to workflows** — mitigated by browser E2E over the real
   API for every governed action (approve, advance, transform, resubmit)
   before acceptance.

## Recommendation
Concept **C (Hybrid)** as the base, with Concept A's dark executive theme
kept as the Command Center's dark mode. Rationale: GAEB's real users are
mostly operators (B/C patterns serve them daily), leadership needs the
executive altitude without a separate product, and C is the only concept
where both audiences share one shell, one data model and one build. A alone
risks operator density; B alone undersells the platform to leadership.
This is a recommendation — the selection is the owner's.
