# Known Limitations & External Dependencies (customer copy)

Stated by Veebase before GAEB has to discover them:

1. **Two transforms await GAEB source evidence.** Budget
   appropriations (the shared PBA3* master definitions were not
   in the delivered source) and Estimates operations (the item
   master file was never identified). Both are excluded from
   the pilot scope until GAEB supplies the evidence.
2. **One file definition conflicts.** INV001PF exists in three
   non-identical definitions; BD-03 resolves it against the
   live system.
3. **CCSID 425 content cannot be decoded safely** with the
   tables available; such content stops for a decision rather
   than being guessed (BD/B-05 track).
4. **Business equivalence is unproven by design** until real
   data runs: eight decisions (BD-01…BD-08) are GAEB's to make;
   the platform implements exactly what is decided.
5. **Release pipeline:** CI execution, Docker certification,
   and branch protection await one repository-owner
   authorization (workflow scope). Local suites carry
   verification meanwhile; nothing is claimed beyond that.
6. **Independent security assessment has not been performed.**
   A handoff package is ready; GAEB's reviewer owns the review.
   Screen-reader (NVDA/VoiceOver) validation likewise remains
   an external exercise — automated accessibility checks are
   clean but are not a substitute.
7. **The pilot topology is single-host** — appropriate for a
   pilot, explicitly not production high availability. The
   production architecture is specified for the Week-3 gap
   assessment against GAEB's requirements.
8. **Performance figures are sandbox floors** (shared 1.5-vCPU
   build machine), useful as minimums, never as SLAs.
