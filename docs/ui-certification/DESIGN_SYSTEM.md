# Design System — As Certified (2026-11-13)

Tokens live in `platform/frontend/src/theme.css` (Tailwind v4 `@theme`
plus component classes). This document records the certified state;
the original recommendation is in `docs/ux-redesign/DESIGN_SYSTEM.md`.

## Palette
- Rail navy `#0a1a33 → #081426`; brand blue `#2563eb`; teal accent
  `#0e9f8a` (buttons use the darker `#0b7a68` for AA contrast with
  white text); ink `#0f1f38`; ink2 `#42506a`; ink3 `#5b6b84`
  (darkened in this certification from `#8494ad` — 3.07:1 → ~5.0:1).
- Status tones (chip text/background pairs all ≥4.5:1 after F-10):
  ok `#146c3c`/`#e5f4ec`, warn `#8a5a00`/`#fdf3dd`,
  info `#084a8a`/`#e8f1fb`, bad `#a92c28`/`#fbe9e7`,
  mut `#42506a`/`#eef1f6`, vio `#5a4fb0`/`#efecfb`.
- Dark (command) scope `.dark`: panel `#0e2138`, line `#1c3658`,
  text `#eaf1fd`, muted `#8fa8cc` — used by Geographic Intelligence
  and the migration live monitor.

## Typography
Inter (Latin) / IBM Plex Sans Arabic (Arabic), loaded from Google
Fonts with system fallbacks. Scale: page title 20/800, panel title
13.5/650, body 13–13.5, table 12.5–13, micro labels 11–11.5 uppercase
for rail groups and table headers.

## Components
See `COMPONENT_ARCHITECTURE.md`. Corner radius 9–12px on cards,
8px on controls; no decorative gradients beyond the rail and brand
mark; icon set Lucide at 15–17px in navigation, 15px in KPI chips.

## Rules carried from the approved direction
- No emoji navigation; no oversized decorative counters (every KPI
  binds to an endpoint with a documented definition).
- Status is never conveyed by color alone: every status renders a
  localized text label via `StatusChip`.
- Money is exact-decimal end to end, including display (F-08).
- Arabic is a layout, not a translation: full RTL mirroring, Arabic
  labels for every enum, locale digits with Latin identifiers and
  P-codes preserved.
