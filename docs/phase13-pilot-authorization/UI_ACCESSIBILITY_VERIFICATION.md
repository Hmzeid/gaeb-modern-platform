# Phase 13 — UI & Accessibility Verification (Workstream H)

The Administration pilot panel now runs the full governance
workflow (no redesign — same panel, extended):
- **Current authorization status** at the top of an opened pilot:
  eligible / not eligible with the live reasons list, straight
  from the decision function.
- **Evidence workflow**: create (condition, document type,
  signatory) → submit with document reference → the verification
  queue shows SUBMITTED records with Verify/Reject for verifier
  roles, Revoke for VERIFIED ones; every record shows its status
  in words and its hash label (declared-unverified vs
  server-computed) — no control implies more than the server
  enforces, and a standing note tells verifiers they cannot
  verify their own submissions (the server refuses it anyway).
- **Datasets**: register (key, extract ref, optional file hash),
  authorize — with the server refusing authorization without
  verified extract evidence.
- **Suspend / Reactivate** beside Activate/Close, with a reason
  prompt for suspension.
- Bilingual throughout (+~74 dictionary keys this phase; parity
  enforced by the frontend suite, 32/32), RTL-correct via the
  existing logical-layout system, keyboard-operable native
  controls, explicit text status labels (no color-only states).

Verification: browser E2E **40/40** incl. axe zero violations on
the admin view; visual regression **31/31** (the panel's new
sections render on pilot selection, so default captures are
unchanged). Screen-reader execution remains NOT VERIFIED
(external pack ready; unchanged status).
