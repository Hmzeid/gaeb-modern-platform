# Component Architecture — UI Certification Assessment

Question posed by the certification directive: do the hand-built
components satisfy enterprise requirements, and should mature
libraries replace them?

## What exists

The frontend is React + TypeScript with a small, deliberate component
set in `platform/frontend/src/components.tsx`:

- `Chart` — ECharts wrapper (lazy library load, click events, font
  follows language, dispose on unmount)
- `StatusChip` — the single renderer for every enum in the system;
  tone map in `i18n.ts`; null-safe (a missing value renders an
  em-dash, never a crash — regression-tested)
- `StageStepper`, `SegBar`, `Kpi`, `Panel`, `Drawer` (Esc + backdrop
  dismissal, `role="dialog"`, `aria-modal`), `DefList`, `Empty`,
  `Skel`, toast context, `ErrorBoundary` (a failed view degrades to a
  retryable panel instead of white-screening the shell — this fired
  once during certification and contained a map-registration defect)
- Form controls are native elements styled by the token layer
  (`theme.css` on Tailwind v4 tokens)

## Assessment against enterprise requirements

| Requirement | Verdict | Evidence |
|---|---|---|
| Keyboard navigation | Adequate | Native controls throughout; visible focus via browser + token outlines; drawer Esc handling; sortable headers are real buttons |
| Focus management | Partial | Drawer does not trap focus or return focus to the opener (residual R-C-5) |
| Accessibility | Good after fixes | axe: zero critical/serious on scanned views; contrast corrections in F-10 |
| Reusability | Good | One chip/stepper/drawer system-wide; no per-view forks |
| Maintainability | Good | ~11 components, one token file; dictionary parity enforced by test |
| Validation | Server-led | Forms rely on API validation with verbatim error toasts; no client-side field validation framework (acceptable for internal console; revisit for public forms) |
| Responsive | Fixed in this certification | F-01 |
| Internationalization | Strong | Full EN/AR dictionaries (242 keys, parity-tested), RTL by `dir`, locale formatters |
| Testability | Now covered | 27 Vitest component/unit tests + browser E2E |

## Library decision (unchanged from the design-system evaluation)

- **Radix / React Aria**: not adopted. The current primitives cover
  the interaction surface (dialog, buttons, selects) with native
  semantics. The one real gap is drawer focus trapping; if the drawer
  grows into multi-step wizards, adopt Radix Dialog for that surface
  alone rather than re-platforming.
- **TanStack Table / AG Grid**: not adopted. Tables are server-capped
  (≤200 rows) with client sort/pagination where needed; AG Grid's
  licensing and weight are unjustified at this scale. Revisit if
  server-side grids with 10k+ rows become a requirement.
- **TanStack Query**: not adopted; data fetching is simple
  load-on-mount per view. The known cost is refetch-on-navigation,
  measured acceptable in `PERFORMANCE_REPORT.md`.
- **ECharts**: retained; now lazy-loaded (F-14).

Conclusion: the hand-built set is coherent, tested, and sufficient
for this application's interaction complexity. The decision is
documented as reversible per-surface rather than ideological.
