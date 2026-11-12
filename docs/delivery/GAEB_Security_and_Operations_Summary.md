# GAEB Security and Operations Summary

## Security posture (self-assessed; independent approval outstanding)
- Authentication: scrypt password hashing; opaque, revocable session tokens
  (SHA-256 at rest); first admin created only via CLI; no seeded users.
- Authorization: six roles with separation of duties — the migration operator
  cannot approve mappings; the approver cannot import; the certifier cannot
  authorize payment. Approvals are bound to the approver's authenticated
  identity and the exact transformation definition hash, revocable with
  immediate effect, and recorded in an append-only history.
- Data protection: parameterized queries throughout; uploads streamed with
  byte caps, hashed during upload, stored 0600; customer data governed by the
  Transfer Protocol (docs/customer/).
- Audit: every login, import, approval, stage transition, and job event is
  recorded with its actor.
- Declared gaps: TLS terminates at the deployment proxy (runbook-mandated);
  audit WORM export scoped but not built; dependency scanning awaits CI
  activation. Full register: docs/security/GAEB_Residual_Risk_Register.csv.

## Operations
- Runbooks: deployment, rollback, operations manual, backup/restore
  validation, pilot deployment (docs/release/, docs/pilot/).
- Observability: Migration Center shows batches, quarantine, approvals,
  intake stages, job states, and live metrics — all from database state.
- Recovery: chunk-level import resume; database restart recovery verified;
  logical and physical restores verified by fingerprint comparison.
- Support model: L1 operator procedures in the Operations Manual; escalation
  to the delivery team for reconciliation failures and approval disputes.
  24/7 support is NOT claimed — it requires a staffing arrangement GAEB and
  Veebase agree separately.
