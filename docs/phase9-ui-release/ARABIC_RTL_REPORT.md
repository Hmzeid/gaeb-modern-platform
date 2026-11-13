# Phase 9 — Arabic / RTL Report (Workstream A4 + D)

## Closure of the last gap (R-C-4)
The migration import-result and transform-result messages — the
certification's documented residual — are now composed entirely
from dictionary keys with locale-formatted numbers:
`الدفعة mig-…: تم تحميلها ٦، مرفوضة ٠، في منطقة التجهيز ٦`.
A full sweep for hardcoded user-facing strings (toasts, prompts,
empty states, validation, statuses, controls) found no others; the
two `window.prompt` dialogs already used dictionary labels.

## Automated enforcement
- Dictionary parity test: EN and AR key sets identical, no empty
  values — now **249 keys per language** (was 242 at certification;
  +7 for the message keys).
- Stage-label coverage test: every tender/certificate/intake stage
  has a label in both languages (unchanged, still passing).
- Browser E2E: Arabic Migration Center renders localized content
  with `dir=rtl` (new in Phase 9), in addition to the existing
  Arabic overview check.
- Visual regression: 13 of the 31 baselines are Arabic (11 desktop +
  2 tablet), all passing at 0.00% on repeat.

## Rules re-verified in this phase
- Identifiers stay Latin: batch IDs, P-codes, legacy codes, hashes —
  including inside the newly localized migration messages.
- Values localize: counts in the migration messages now use
  `fmtInt` (Arabic-Indic digits in AR), consistent with the rest of
  the UI.
- The School Map's server-side search matches Arabic names via the
  same parameterized ILIKE as English; trigram indexes cover
  `name_ar` as well as `name_en`.
- RTL behavior of the new drawer focus trap is direction-agnostic
  (DOM order), verified by the Arabic E2E workflow rendering and
  the AR visual baselines; the drawer itself mirrors with the shell.

## Verdict
**PASS** — no known untranslated user-facing strings remain in the
supported scope.
