# GAEB Security Assessment — self-assessment (NOT an independent audit)

Date basis: Phase 4, commit line from a756241. Assessor: the delivery team.
An independent security review remains an open gate (B-11) and must be performed
by GAEB-authorized reviewers before production.

## What was verified by execution
- Password storage: scrypt with explicit memory parameters; no seeded users in
  production mode; first admin only via CLI.
- Sessions: opaque tokens, SHA-256 stored server-side, revocable.
- Authorization: role matrix enforced per route; report-level authorization for
  financial exports (403/200 tested); audit endpoint admin-only (tested).
- Approval security: identity from session only (forgery test), evidence required
  for customer mode (400 tested), revocation effective immediately (422 tested),
  definition-hash binding, mode separation, importer≠approver, advisory-lock
  serialization, append-only history (≥6 events asserted).
- Uploads: streamed, hashed during streaming, byte-capped mid-stream with
  delete-on-exceed, 0600 temp permissions.
- Injection: parameterized queries throughout the migration layer; staging DDL is
  generated from the reconciled register, never from user input.
- Money integrity: decimal-only arithmetic; negative certificate net throws.

## Findings
| ID | Severity | Finding | Status |
|---|---|---|---|
| F-01 | Medium | No TLS termination inside the app; deployment must terminate TLS at a reverse proxy (documented in the deployment runbook) | Open — deployment control |
| F-02 | Medium | Audit log integrity depends on DB access control; no external WORM export yet | Open (R-03) |
| F-03 | Low | Session TTL is fixed; no idle-timeout distinction | Open (R-04) |
| F-04 | Low | Dependency scanning exists only as CI configuration (workflow scope pending) | Open (R-02) |
| F-05 | Info | IBM425 files cannot be decoded (no verified table) — fails safe via quarantine | Accepted, B-05 |

No critical or high findings are open in the code as assessed. This statement
covers the assessed scope only and is not a penetration-test result.
