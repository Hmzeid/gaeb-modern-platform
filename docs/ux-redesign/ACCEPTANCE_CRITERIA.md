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
