# Phase 9 — Residual Closure (Workstream A)

All six residuals from the UI certification are closed. One closure
(R-C-3's sibling finding on mobile) also corrected an incompleteness
in the certification's own F-01 fix, disclosed in §A6 below.

## R-C-1 — Drawer focus management — CLOSED
`Drawer` (platform/frontend/src/components.tsx) now implements the
modal contract: focus moves to the first focusable element on open;
Tab/Shift+Tab cycle within the drawer; Escape closes; on close, focus
returns to the element that opened it; `role="dialog"`,
`aria-modal="true"`, `aria-label` from the drawer title. Nested
dialogs are not used anywhere in the application. Five automated
tests (Vitest + Testing Library) cover focus-in, both wrap
directions, Escape, and dialog semantics — all passing. Browser E2E
additionally verifies open → Escape → closed against the real stack.

## R-C-2 — Automated visual regression — CLOSED
`platform/frontend/e2e/visual.mjs` (puppeteer + pixelmatch): 31
deterministic shots — all 11 views in EN and AR at desktop, key views
at tablet, critical views at mobile — fixed viewports, animations
disabled by injected CSS, 0.5% pixel threshold, diff artifacts
written to `e2e/visual-diffs/` on failure. Baselines live in
`e2e/baselines/` and are only ever rewritten by an explicit
`--update` run after human review — never automatically. Result on
the final Phase 9 build: **31/31 pass at 0.00% difference** on a
repeat run. See `VISUAL_REGRESSION_REPORT.md`.

## R-C-3 — School Map server-side pagination — CLOSED
`GET /api/buildings` gained a paged mode (legacy array mode retained
for existing consumers): page/pageSize (≤100), whitelisted sort
columns and direction, governorate filter, substring search across
EN/AR names and the legacy code — all values parameterized, ILIKE
wildcards escaped. Ordering always ends with the primary key, so
pages are stable under duplicate sort values. The School Map UI now
holds exactly one page of results and drives paging/sorting/
filtering/search (300 ms debounced) against the server. Migration
010 adds supporting indexes; migration 011 adds guarded pg_trgm GIN
indexes so substring search stays index-backed. Scale evidence:
`SCALE_TEST_REPORT.md` (10,000 / 100,000 / 1,000,000 records).
**Pagination semantics during concurrent change (as specified):**
offset pagination over the live table — rows inserted or deleted
between page fetches can shift later pages by that many rows; the
total reflects the moment of each request. Snapshot consistency is
NOT provided and is not required for a registry browser; exports and
reconciliation use their own consistent paths.

## R-C-4 — Arabic localization completion — CLOSED
The last English operator strings (the migration import result and
transform result messages) are now composed from dictionary keys
(`msg_*`) with locale-formatted counts. A sweep of all user-facing
string surfaces (toasts, prompts — already dictionary-driven — empty
states, validation toasts, workflow statuses, table controls) found
no other hardcoded strings. Dictionary parity is test-enforced at
**249 keys per language**.

## R-A-1 — Heading hierarchy — CLOSED
Root causes found by probe: the shell's hidden `h1` sat outside any
landmark, module views had no page-level heading (panel `h3`s
followed the `h1` directly), and the Portfolio Overview carried its
own second `h1`. Corrections: every view now opens with a visible
`h2` page title rendered by the shell from the navigation model; the
`h1` moved inside `<main>`; the overview's duplicate title element
was removed (its subtitle and context chips remain). Verified heading
sequence on the overview: H1 → H2 → H3 panels. axe heading-order:
**zero nodes on all 11 views** (was 1 moderate on overview).

## R-A-2 — Landmarks — CLOSED
The single `region` notice traced to the same out-of-landmark `h1`;
moving it inside `<main>` cleared it. The topbar form now carries
`role="search"`. Landmark set: banner (header), primary navigation
(nav, labelled), complementary (rail aside), main, search, plus
dialog and live-region (toast) semantics. axe region: **zero nodes
on all 11 views**. Full axe result on the final build: **zero
violations of any severity on all 11 views** (EN, desktop) — see
`ACCESSIBILITY_REPORT.md`.

## Disclosure — the certification's F-01 mobile fix was incomplete
Phase 9's programmatic overflow probe (document scrollWidth vs
viewport) found what the certification's screenshot review missed:
at phone widths the shell's single grid column sized itself to
~1,807 px because the horizontal rail navigation's no-wrap content
inflated the track's automatic minimum size — the page scrolled
horizontally, and fixed-width screenshots showed a plausible-looking
left slice of an oversized layout. Phase 9 correction
(`theme.css` ≤900px): the rail is width-contained (`min-width: 0`,
`overflow: hidden`) and the nav caps at 100% width with internal
scrolling. Verified: scrollWidth equals the viewport width on
overview, geo, map and tenders at 390×844 (migration retains a 2 px
rounding artifact, recorded in the accessibility report). A permanent
E2E check now asserts no horizontal overflow at mobile width, so the
class of defect cannot silently return. The certification's F-01
entry stands as written for layout structure; its "verified" claim
for mobile is superseded by this correction.
