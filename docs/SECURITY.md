# Security Architecture (implemented baseline + open approvals)

Implemented in platform/ (Milestone 2 scaffold):
- scrypt password hashing (salted, memory-hard), 10-char minimum policy hook.
- Opaque session tokens, SHA-256 stored server-side, 8h expiry, revocable (logout revokes).
- RBAC with separation of duties enforced in workflow transitions (certifier ≠ payer).
- No seeded users or demo credentials in the production path; first admin via CLI only.
- Full audit log table for mutations; structured JSON error logging; 1MB JSON body limit.

Not yet implemented / requires customer input (B-11):
- MFA and OIDC/SSO integration (no IdP specified yet).
- TLS termination policy, encryption-at-rest configuration, backup RPO/RTO — deployment
  decisions for the customer's infrastructure.
- Rate limiting and upload scanning (no file-upload surface exists yet in the API).
- Independent security review and sign-off (a release gate, not a code task).

Pre-publication check performed before every push to this public repository: secret scan
(grep patterns in CI) + manual review that no original customer files, real production
records, or credentials are included. The repository contains analysis and generated
artifacts from the customer's source listings only, at the customer's director's request.
