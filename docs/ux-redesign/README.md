# Enterprise Experience Transformation — Concepts for Selection

Status: **AWAITING OWNER SELECTION** (no production frontend code changed).

## Contents
- `AUDIT.md` — screen-by-screen audit of the current frontend
- `DESIGN_SYSTEM.md` — the recommended stack and component inventory
- `REDESIGN_PLAN.md` — screen-by-screen plan + data-binding table
- `IMPACT_ASSESSMENT.md` — what changes, what doesn't, risks, recommendation
- `ACCEPTANCE_CRITERIA.md` — the proposed verification bar
- `prototypes/` — three self-contained, browser-rendered concepts
  (open the HTML files in any browser; `?view=` switches to the module
  screen, `?lang=ar` renders Arabic RTL; buttons switch views in-page)
- `screenshots/` — rendered captures of every concept (desktop 1560×980)

## The three concepts
| | Concept | Screens captured |
|---|---|---|
| A | **Executive Intelligence** — dark navy command center, KPI band, cross-module analytics, risk & approvals at a glance. Module: Payment Certificates workspace. | `a1` dashboard EN · `a2` certificates EN · `a3` dashboard AR |
| B | **Government Operations** — light ERP workspace, approvals inbox, deadline watch, dense tables. Module: Tenders with filter bar, pagination and record drawer with stage stepper. | `b1` overview EN · `b2` tenders EN · `b3` overview AR |
| C | **Hybrid Enterprise** — navy executive band over a light operations workspace. Module: School Map with distribution chart, data-quality panel and record inspector. | `c1` home EN · `c2` school map EN · `c3` home AR |
| D | **Reference Synthesis** — built 2026-11-13 from the owner's own reference boards (Stratify-style light executive over a navy rail; ArcGIS-style dark geospatial command view). Default light "Portfolio Overview" (tabbed executive summary, icon-chip KPIs, donut + legend values, stacked module-health bars, stage tiles, realization ring, activity) + dark "Geographic Intelligence" (Egypt governorate bubble map, alerts, gauges, ranked regions). | `d1` dashboard EN · `d2` geo EN · `d3` dashboard AR |

**Direction after owner feedback (2026-11-13):** the owner endorsed the
reference styles rather than picking A/B/C outright. Concept D is the
synthesis of those references and is the recommended base: D's light
executive shell for daily work, A's dark theme for command/geo views,
B's operational patterns (inbox, drawers, dense tables) inside the modules,
C's one-shell/two-altitudes structure. Awaiting the owner's go to begin
implementation on that basis.

All figures in the concepts are **synthetic demonstration data**, labeled as
such in every screen, shaped from the platform's real data model and legacy
analysis. The production build binds every widget to live APIs (see the
data-binding table in `REDESIGN_PLAN.md`).

Known concept-level rough edges (recorded honestly): in Concept A's Arabic
render, two ECharts label placements collide (region axis labels and funnel
stage labels). Both are chart-wrapper fixes budgeted in the plan — ECharts
has no native RTL mode, and handling that properly is part of the design
system work, not a blocker.
