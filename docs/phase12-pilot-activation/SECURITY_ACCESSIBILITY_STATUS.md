# Phase 12 — Security & Accessibility Status

## Security — internal (executed)
- The pilot gate added this phase is itself a security control,
  and it is covered by negative tests: non-admin pilot creation
  403, non-admin attestation 403, attestation without evidence
  400, activation with missing conditions 422, customer-class
  import without an active pilot 422 (both import paths).
- The full backend security-negative suite (injection, traversal,
  throttling, correlation IDs, separation of duties) remains green
  in the 65/65 baseline.
- New-code review points: pilot routes are admin-gated for writes
  (`*` permission), read-gated by `migration.run`; all state
  changes audit-logged (create, attest, verify, activate, close);
  read routes hardened to return 500 rather than terminate on a
  database error.
- Dependency inventory unchanged (SBOM, 98 components);
  `npm audit` remains unexecutable through the sandbox registry
  proxy — recorded, not passed.

## Security — external (ready, not executed)
Independent review handoff unchanged and current
(Phase 10 package §03 + Phase 11 qualification): scope,
environments, per-role accounts, evidence index, and suggested
start points — to which this phase adds: pilot-gate bypass
attempts against `/api/pilots/*` and the customer-class import
paths. **No independent review has been performed; GAEB's
approval (B-11) remains an external gate.**

## Accessibility — automated (executed)
axe zero violations on all 11 views re-verified this phase with
the new Pilot activation panel present (the panel uses the
existing token system, labelled controls, and table semantics);
E2E 40/40 includes the admin view.

## Accessibility — external (ready, not executed)
NVDA/VoiceOver execution pack unchanged
(`docs/phase10-pilot-package/ACCESSIBILITY_EXTERNAL_VALIDATION.md`)
with one addition for the reviewer: a seventh flow covering the
Pilot activation panel (conditions table reading order,
attestation prompt, activation result announcement).
**Screen-reader validation remains NOT VERIFIED** — an external
gate for production (G4), schedulable in parallel with the pilot.
