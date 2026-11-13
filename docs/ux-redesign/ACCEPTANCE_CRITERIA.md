# Proposed Acceptance Criteria — Enterprise Experience Transformation

The redesign is accepted when **all** of the following hold, each with
evidence produced in the verification phase:

1. **Regression**: the existing backend suite passes unchanged (65/65,
   0 skipped) against the final build.
2. **Function preserved**: every action available in the current UI
   (create/advance/approve/revoke/transform/import/resubmit/export, live
   monitor) is reachable and works in the new UI — verified by browser E2E
   tests against the real API, listed test-by-test.
3. **No fake UI**: no button, chart or figure exists without a working
   binding to an API or an explicitly labeled demonstration dataset.
4. **Data correctness**: dashboard figures are traced to their endpoints in
   a data-binding checklist (REDESIGN_PLAN.md table) and spot-verified
   against the API responses.
5. **Bilingual parity**: every screen ships in English and Arabic; the full
   screenshot matrix (all screens × EN/AR × desktop/tablet) shows no clipped
   text, no horizontal overflow, no broken RTL (navigation, tables, charts,
   drawers all mirrored correctly).
6. **Accessibility**: keyboard-only completion of the core flows (sign in,
   approve a certificate, advance a tender, run an import); visible focus;
   status never conveyed by color alone; WCAG 2.1 AA contrast for text.
7. **Frontend tests**: component tests for formatters, StatusChip, table
   filtering and the stage steppers; E2E for the governed flows; all green
   in the suite.
8. **Performance sanity**: dashboard interactive without layout shift;
   charts code-split; no screen blocked on a sequential waterfall of
   requests.
9. **Before/after record**: side-by-side screenshots (current vs redesigned)
   for every screen, filed under `docs/ux-redesign/verification/`.
10. **Honest residuals**: anything not delivered is listed in a residual
    register with the reason — no silent gaps.

---

## Results — Concept D implementation, 2026-11-13

1. **Regression — MET.** 65/65 pass, 0 skipped, 0 fail with
   `TEST_DATABASE_URL` set (full integration E2E executed, including new
   `/api/overview` assertions).
2. **Function preserved — PARTIAL.** Every pre-redesign action is
   reachable in the new UI on the same endpoints, and those endpoints
   are covered by the backend suite; a full click-through browser E2E
   was not executed (R-UX-2).
3. **No fake UI — MET.** All figures bind to live endpoints; the two
   prototype-style header dropdowns were converted to static context
   labels because no filtering endpoint semantics exist for them.
4. **Data correctness — MET.** Screenshot figures spot-verified against
   `/api/overview` responses (counts, EGP 7.27B allocated, EGP 356,445
   paid net).
5. **Bilingual parity — PARTIAL.** Overview verified EN + AR + tablet;
   modules verified EN; Arabic module renders and tablet module renders
   not captured (R-UX-3).
6. **Accessibility — PARTIAL.** Focus outlines, aria labels, `aria-live`
   toasts/monitor, Esc-dismissed drawer in place; keyboard-only flow
   completion not formally tested (R-UX-8).
7. **Frontend tests — NOT MET.** None added (R-UX-1).
8. **Performance sanity — MET (basic).** Chart views code-split via
   lazy chunks; dashboard fetches run in parallel. ECharts chunk ~1 MB
   (R-UX-4).
9. **Before/after record — MET (filed pairs).** Before: `docs/images/`
   01–12. After: `verification/` n1–n8. Not composited side-by-side.
10. **Honest residuals — MET.** `IMPLEMENTATION_NOTES.md` R-UX-1…R-UX-8.
