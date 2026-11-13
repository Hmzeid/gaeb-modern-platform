# 03 — Security Architecture & Independent-Review Handoff

## Controls implemented and evidenced
- **Authentication:** server-side sessions (opaque tokens, SHA-256
  at rest), scrypt password hashing, per-account+IP login
  throttling (10 failures / 10 min → 429), no seeded users.
- **Authorization:** role-based permissions per module with
  separation of duties (e.g. a certificate's certifier cannot
  authorize its payment; mapping approvals cannot be self-granted
  by the importer; approvals are bound to the transform's current
  hash and an evidence reference in customer mode).
- **Audit:** append-only application audit log (actor, action,
  entity, before/after detail) covering workflow transitions,
  approvals, imports, and administration; admin-only read access.
- **API security:** all queries parameterized; list endpoints use
  sort/filter whitelists; security headers (CSP `default-src
  'none'` on the API, `X-Frame-Options: DENY`, nosniff, no-store);
  correlation IDs on every request.
- **Data protection:** money as exact decimals; original Arabic
  bytes preserved with raw-hex evidence on quarantined records;
  password material is never selected by any endpoint.
- **Negative testing:** the integration suite asserts 401/403
  paths, finance-payload withholding by role, injection-string
  rejection, and wildcard-escape behavior (Phases 9–10 evidence).

## Known residual risks (from the standing register)
RR-01 TLS terminates at the deployment proxy · RR-02 audit log has
no external WORM export yet · RR-03 dependency scanning awaits CI
activation · RR-04 CCSID-425 files cannot be decoded (B-05) ·
RR-05 sessions use absolute TTL (no idle timeout) · RR-06
single-host pilot topology; multi-host DR is GAEB's infrastructure
decision.

## Independent review handoff (prepared for GAEB's reviewers)
A penetration test / security review can start from:
- This document + `docs/security/` (assessment, evidence index,
  residual-risk register) and the Phase 8 GitHub/CI audit.
- A dedicated review environment (the demonstration environment)
  with reviewer accounts at each role, including a read-only role.
- Scope suggestions: authentication/session lifecycle, RBAC
  matrix enforcement, approval-gate bypass attempts, migration
  intake file handling, API injection surface, audit-log tamper
  evidence.
- **Status: handoff PREPARED. No independent review has been
  performed and no security approval has been granted (B-11).**
  GAEB's security approval is a production gate (§12).

## Secrets management (pilot)
Database credentials and session configuration are injected by the
host environment, never committed. The repository contains no
production secrets; demo credentials exist only in the sandbox demo
instance and must be rotated/provisioned fresh for any GAEB-hosted
deployment (installation step 5, §02).
