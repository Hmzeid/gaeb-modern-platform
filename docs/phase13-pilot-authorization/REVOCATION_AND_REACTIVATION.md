# Phase 13 — Revocation & Reactivation (Workstream D)

## Pilot states and their meaning
- **draft** — created; conditions being assembled. No imports.
- **active** — all conditions currently satisfied at activation;
  eligibility still re-evaluated per operation.
- **suspended** — an administrator halted the pilot (reason
  required, recorded). Imports and transforms refuse immediately.
  Suspension is the operational pause button: it does not destroy
  evidence or history.
- **closed** — the pilot ended (acceptance recorded elsewhere).
  Imports refuse. Closure is final; a new pilot is a new record.

## Reactivation is not restoration
`POST /pilots/:id/reactivate` runs the **full condition
evaluation fresh** — verified-evidence currency, live automated
checks — and only then flips the state, atomically
(`UPDATE … WHERE status='suspended'`; a concurrent state change
yields 422). If anything has lapsed meanwhile, reactivation is
refused with the reasons. Nothing silently restores.

## Invalidation triggers (each fails the next decision closed)
Revoked evidence · expired evidence (materialized at evaluation)
· superseded evidence replaced by an unverified successor ·
revoked transformation approvals · dataset retired or hash
mismatch · environment qualification failure (auto check) ·
suspension · closure. The fail-closed property is structural:
the decision function has no path that returns eligible on stale
data — every input is read or computed at decision time.
