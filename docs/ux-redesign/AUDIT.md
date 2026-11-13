# UI/UX Audit — GAEB Modern Platform frontend (2026-11-12)

Scope: all 12 production screenshots (`docs/images/`), the complete frontend
source, and the API surface (47 routes). Method: screen-by-screen inspection
against enterprise references (Microsoft Fabric/Power BI, SAP Fiori, Palantir
Foundry). Scores: 1 = absent/prototype-grade, 5 = enterprise-grade.

## The structural finding

The entire production frontend is **one 246-line component** (`platform/frontend/src/App.tsx`)
plus a **12-line stylesheet**. There is no router, no component library, no
design tokens, no charting, no state management beyond `useState`, and no
frontend tests. Every module is the same two elements — a create-form card and
a bare table — regardless of the business process it serves. The backend
exposes rich data the UI never surfaces (migration metrics, per-batch progress,
reconciliation, three report aggregates, the full audit log).

**The presentation is two generations behind the engineering.** This audit
recommends: **reuse** the API contracts and business logic untouched;
**rebuild** the frontend shell, components and every screen; **redesign** the
information architecture around roles (executive / operator) rather than
database tables.

## Screen-by-screen

| Screen | Visual | Info arch. | Workflow | Density | Nav | Interaction | A11y | RTL | BI value | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| Sign in | 2 | 3 | 3 | 1 | — | 2 | 2 | 3 | — | Rebuild (branding, SSO-ready, error states) |
| Dashboard | 1 | 1 | 1 | 1 | 2 | 1 | 2 | 3 | 0 | **Rebuild entirely** — currently one line of counts |
| School Map | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 0 | Rebuild (registry + inspector + quality) |
| Budget | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 0 | Rebuild (execution analytics) |
| Tenders | 2 | 2 | 3 | 2 | 2 | 2 | 2 | 3 | 0 | Rebuild (pipeline, deadlines, drawer) |
| Certificates | 2 | 2 | 3 | 2 | 2 | 2 | 2 | 3 | 0 | Rebuild (pipeline + money formatting) |
| Estimates | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 0 | Rebuild (catalogue workbench) |
| Real Estate | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 3 | 0 | Rebuild (case timeline + decree gate) |
| Reports | 1 | 2 | 2 | 1 | 2 | 1 | 2 | 3 | 1 | Rebuild (analytics, not CSV links) |
| Migration Center | 3 | 3 | 4 | 3 | 2 | 3 | 2 | 3 | 2 | **Redesign** — strongest screen; needs the enterprise shell, not replacement of its function |

## Cross-cutting findings

1. **Data presentation defects.** Money renders as raw storage decimals
   (`1250000.0000`) — no thousand separators, no currency, no tabular figures.
   Statuses render as raw enum strings (`certified`, `offers`) with no visual
   language. Dates, counts and codes have no consistent format.
2. **No information hierarchy.** Every screen is a single column of identical
   cards at one visual weight. Nothing answers "what needs my attention?"
3. **No business intelligence.** `/api/reports/*` (budget utilization,
   buildings by governorate, certificate summary), `/api/migration/metrics`
   and `/api/migration/batches/:id/progress` exist and are unused or barely
   used by the UI. The dashboard shows none of them.
4. **Navigation is a tab strip.** Nine equal tabs, no grouping (executive /
   operations / governance), no badges (pending approvals!), no search, no
   breadcrumbs, no record-level routing — a record cannot be linked or
   bookmarked.
5. **Workflow is invisible.** The tender stage machine, certificate chain,
   estimate revisions and the expropriation decree gate are real backend
   state machines rendered as a single "Advance" button. Users cannot see
   where a record is, what is blocked, or why.
6. **No feedback system.** No toasts, no loading skeletons, no empty states,
   no inline validation, no confirmation for governed actions.
7. **Accessibility gaps.** No focus-visible styling, no aria-live (except the
   Phase 8 live monitor), tables without captions/scope, color is the only
   status signal, keyboard flow untested.
8. **Arabic RTL is structurally sound but typographically bare** — direction
   flips correctly (verified in screenshots), but there is no Arabic typeface,
   numerals/mixed-direction values are unhandled, and chart libraries were
   never evaluated for RTL.
9. **Responsive behavior is accidental.** The single column reflows, but
   tables overflow on tablet widths and there is no density strategy.
10. **The Migration Center is the exception** — inventory, operations strip,
    live monitor, approvals, reconciliation. Its *function* is
    enterprise-grade; it needs to be re-skinned into the new shell and given
    the same table/drawer discipline, not redesigned away.

## What the redesign must therefore do

- Introduce a real application shell (grouped navigation, global search,
  role-aware home, approvals inbox with badges).
- A design system with tokens, an enterprise table, drawers, dialogs, toasts,
  skeletons and a chart theme — in both light and dark, EN and AR.
- Role-altitude dashboards: executive intelligence (Concept A patterns) and
  operational queues (Concept B patterns), over **one** data model.
- Every widget bound to an existing API or a named, small backend addition
  (see REDESIGN_PLAN.md data-binding table). No decorative metrics.
