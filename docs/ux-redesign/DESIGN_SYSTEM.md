# Design System Recommendation

## Decision

| Layer | Choice | Why |
|---|---|---|
| Styling | **Tailwind CSS** with CSS-variable design tokens | Utility speed + a token layer (color, spacing, type, radius, elevation) that themes light/dark and flips for RTL via logical properties. Already compatible with the Vite build. |
| Primitives | **Radix UI** (dialog, dropdown, tabs, tooltip, popover) + a thin in-house component kit in the shadcn style (source-owned components, no runtime theming engine) | Accessible, keyboard-correct primitives without adopting a heavyweight visual identity. Components live in the repo and can be art-directed to the GAEB identity — MUI's default look reads as "generic admin template" and fights RTL/theming at this level of customization. |
| Tables | **TanStack Table** | Headless: sorting, filtering, pagination, column visibility, virtualization hooks — full visual control, works with our own markup and RTL. AG Grid is powerful but its enterprise features are license-gated and its DOM fights custom RTL styling. |
| Charts | **Apache ECharts** (already used in the concepts) | The strongest open option for mixed dashboards: funnels, gauges, heatmaps, maps; canvas performance at portfolio scale; themable. Known work item: ECharts has no native RTL mode — axis/label mirroring is handled by our chart wrapper (see Risks). |
| Icons | **Lucide** | One consistent stroke style, tree-shakeable, no emoji anywhere in navigation or status. |
| Type | **Inter** (Latin) + **IBM Plex Sans Arabic** (Arabic) | Inter is the enterprise UI standard; IBM Plex Sans Arabic is designed for institutional Arabic and pairs with it metrically. |
| State/data | Keep the existing `api.ts` fetch layer; add **TanStack Query** for caching, background refresh (live monitor, approvals badge) and optimistic-safe mutations | The backend is session-cookie/token fetch; Query wraps it without changing contracts. |

Explicitly rejected: MUI (visual identity + RTL theming cost), AG Grid
(licensing + styling control), building on the current 12-line CSS (the audit
shows where that ends), and mixing a second chart or table library later —
one of each, chosen once.

## Tokens (extract)

- Color: navy `#0d2242` / graphite / slate scale; teal accent `#0e7a6d`
  (light) / `#2dd4bf` (dark); semantic: success, warning, danger, info —
  always paired with icon/text, never color alone.
- Density: two modes — comfortable (executive) and compact (operations
  tables), one token switch.
- Radius: 8–10px surfaces, 6px controls. No decorative gradients except the
  brand mark and the executive band.
- Motion: 120–180ms ease for drawers/menus; charts animate on first paint
  only; respects `prefers-reduced-motion`.

## Component inventory (build once, use everywhere)

AppShell (rail/topbar variants), PageHeader, KpiCard (with sparkline slot),
ChartPanel, DataTable (filters, saved views, pagination, column toggle),
StatusChip (single source for every enum in the system), Money/Number/Date
formatters (locale-aware: `ar-EG` / `en-EG`), RecordDrawer, StageStepper
(tender/certificate/estimate/intake machines), ApprovalCard, Toast,
Skeleton, EmptyState, ConfirmDialog (for governed actions), SearchPalette
(Ctrl-K), LiveMonitor (already exists — restyled), ProgressBar, Tabs,
FormField set with inline errors.

## Risks and mitigations

- **ECharts RTL**: wrap charts in a `ChartPanel` that sets axis positions,
  legend placement and tooltip direction per locale; verified in the
  acceptance pass with Arabic screenshots (the concepts already show the two
  known rough edges — funnel label placement and axis-label collisions — both
  are wrapper-level fixes, listed in the plan).
- **Scope discipline**: the design system lands first (Phase UX-1) so module
  work is assembly, not invention.
