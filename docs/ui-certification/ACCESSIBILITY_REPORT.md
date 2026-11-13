# Accessibility Report — UI Certification

Method: axe-core executed in the real application via the E2E harness
on Portfolio Overview, School Map, Migration Center, and Geographic
Intelligence (English, desktop). Manual checks: keyboard reachability
of primary flows, drawer Esc dismissal, status-by-text (never color
alone), focus visibility.

## Results

| View | Before (critical/serious) | After |
|---|---|---|
| Overview | color-contrast ×27 nodes | **0 critical / 0 serious** |
| School Map | color-contrast ×5 nodes | **0 / 0** |
| Migration Center | color-contrast ×26 nodes | **0 / 0** |
| Geographic Intelligence | color-contrast ×1 node (pre-fix scan) | **0 / 0** |

One moderate `region` notice (landmark coverage) appears on some
views, and one moderate `heading-order` node remains: module views
have no page-level `h2` title, so panel `h3`s follow the shell `h1`
directly. Both are assessed as acceptable residuals for this release
and recorded as R-A-1/R-A-2 below; neither blocks use with assistive
technology.

## Root causes corrected (F-10)
1. Muted text token `#8494ad` (3.07:1 on white) → `#5b6b84` (~5.0:1).
   This single token accounted for most nodes (timestamps, hints,
   secondary labels across views).
2. White text on teal buttons `#0e9f8a` (3.3:1) → button background
   `#0b7a68` (~4.9:1); the brighter teal remains for non-text accents.
3. White text on danger buttons (3.96:1) → background `#bc3433`.
4. Status chip text: ok `#1f9d63` (3.04:1) → `#146c3c`;
   bad `#d9534f` (3.37:1) → `#a92c28`. (Surfaced only when the
   approvals register began rendering real status chips — F-12.)

## Structure fixes
- Visually hidden `h1` in the application shell (screen-reader page
  title in both languages).
- Geographic Intelligence panel titles corrected `h4` → `h3`.

## What is verified
- All statuses pair color with a localized text label.
- Charts have text equivalents in adjacent panels (KPI values,
  portfolio bars, stage ledger) — the geo view additionally provides
  the ranked governorate list and the selection panel as a full
  non-map alternative to the choropleth.
- Interactive chart elements are mouse-driven; keyboard users reach
  the same records through the tables and the "View in School Map"
  path. Full keyboard chart navigation is not implemented (R-A-3).

## Residuals
- R-A-1: `heading-order` moderate (see above).
- R-A-2: `region` moderate — main content landmarking is partial.
- R-A-3: chart keyboard navigation not implemented.
- R-A-4: drawer focus is not trapped and does not return focus to
  the opener (`COMPONENT_ARCHITECTURE.md`).
- Screen-reader testing with NVDA/VoiceOver was not performed in the
  sandbox; the axe + structure evidence above is the available basis.
