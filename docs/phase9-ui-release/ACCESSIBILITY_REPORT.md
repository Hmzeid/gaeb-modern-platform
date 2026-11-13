# Phase 9 — Accessibility Report (Workstreams A5, A6, G)

Target: WCAG 2.2 AA for the supported application scope.

## Automated results (final build)
axe-core executed in the real application via the browser E2E suite,
now across **all 11 views** (was 4 at certification):

| View | Critical | Serious | Moderate | Minor |
|---|---|---|---|---|
| All 11 views | 0 | 0 | **0** | **0** |

The certification's two moderate residuals are closed:
- **heading-order (R-A-1):** visible `h2` page titles on every view;
  the overview's duplicate internal `h1` removed; verified sequence
  H1 → H2 → H3.
- **region (R-A-2):** the screen-reader `h1` moved inside `<main>`;
  `role="search"` added to the topbar form; landmark set audited
  (banner / labelled primary nav / complementary rail / main /
  search / dialog / status live region for toasts).

## Modal drawer (R-C-1) — keyboard contract, tested
Focus-in on open, Tab/Shift+Tab trapped, Escape closes, focus
restored to the invoking element, `aria-modal` + accessible label.
Covered by 5 unit tests and a browser-level open/Esc check.

## Manual / keyboard verification performed
- Keyboard-only navigation: Tab from the shell reaches the rail
  links in order; Enter activates (E2E-asserted for Tenders).
- Drawer keyboard flow executed in the browser (open via click in
  this run; the focus contract itself is unit-tested with synthetic
  focus, and Escape is browser-verified).
- Status is never color-only (unchanged design rule; every status
  renders a localized text label).
- Focus visibility: browser default + token outlines retained; no
  `outline: none` resets exist in the stylesheet.

## Screen-reader validation — NOT VERIFIED (external gate)
NVDA/JAWS/VoiceOver cannot run in this build sandbox, so no
screen-reader pass is claimed. The structural basis is strong (zero
axe violations, coherent heading outline, labelled landmarks,
dialog semantics, live regions), but per the directive this remains
an **outstanding external validation gate** to be executed on a
workstation with assistive technology before customer acceptance.

## Residual note
At 390×844 the Migration Center measures a 2 px document overflow
(scrollWidth 392) — a sub-pixel rounding artifact on one table;
there is no clipped content. Recorded, not corrected.
