# Phase 13 — Separation of Duties (Workstream B)

Implemented inside the existing RBAC (no second identity system):
- **`pilot.evidence.submit`** — technical + budget roles (+ admin).
- **`pilot.evidence.verify`** — budget role (+ admin). Verification
  and revocation both require it.
- **Pilot administration** (create/activate/suspend/reactivate/
  close, dataset registration/authorization) — admin (`*`).
- **Pilot auditor** — `migration.approve` holders (budget, admin)
  may read the audit export.

Enforced server-side, all verified by tests:
- **Self-verification is refused (422)** — checked against both
  the record's creator and its submitter, regardless of role; an
  administrator who submitted evidence cannot verify it, and the
  attempt is audit-logged as `pilot.evidence.verify.denied`.
- Unauthorized verification (no verify permission) → 403.
- Verification of missing evidence → 404; of PENDING / VERIFIED /
  REJECTED / REVOKED / SUPERSEDED / EXPIRED evidence → 422 with
  the state named.
- Activation and every import decision read only VERIFIED,
  unexpired evidence — there is no endpoint that lets an
  administrator mark a condition satisfied directly (the Phase 12
  attest path is deleted).
- Verified evidence is immutable through the API: document bytes
  can only be attached while PENDING/SUBMITTED; the only exits
  from VERIFIED are revoke (reasoned) and supersede (by a
  successor's verification).
