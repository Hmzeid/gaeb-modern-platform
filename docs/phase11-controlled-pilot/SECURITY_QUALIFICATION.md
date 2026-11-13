# Phase 11 — Security Qualification (Workstream I)

## Trust boundaries
Users ↔ (TLS at GAEB proxy) ↔ frontend/API tier ↔ PostgreSQL.
The AS/400 is outside the boundary entirely: extracts cross it
one-way, offline, under the Intake Protocol; the platform holds no
source-system credentials and cannot write back. The build/CI
environment holds no customer data and no production secrets.

## Control summary (implemented + evidenced)
Authentication (scrypt, opaque hashed sessions, login throttling)
· RBAC with separation of duties (certifier≠payer; importer≠approver
— both refusal paths executed in the Phase 11 rehearsal) ·
privileged actions all audited (approvals, revocations with
mandatory reasons, transforms, imports, user administration) ·
secrets injected by the host, none in the repository · transport
security at the proxy with strict API headers · input validation
(parameterized SQL; whitelist sorts/filters; upload size caps;
format-guarded parsers; NUL rejection) · file intake (hash-verified
uploads, mode-0600 staging, idempotent loads) · data retention per
charter policy · backup security (backups inherit host storage
controls; integrity by fingerprint comparison) · dependency
inventory: SBOM of 98 components (Phase 7), refresh queued behind
CI activation · vulnerability handling: findings enter the defect
register with severity; critical findings are a charter rollback
trigger · incident response per the Operations Handbook.

## Internal checks executed in this phase
The rehearsal's negative battery (R-05a/b/c, R-06, R-08a/b/c,
R-09a/b, R-10) is a live authorization/abuse suite against the real
API — all refused correctly. The backend security-negative suite
and the Phase 9/10 pagination negatives remain green in the
baseline (65/65).

## Penetration-testing handoff (prepared)
Scope, environments, per-role reviewer accounts, and evidence
index: Phase 10 package §03, unchanged and current. Suggested
reviewer start points: session lifecycle, approval-gate bypass
attempts, intake file handling, injection surface on the paged
endpoints, audit-log tamper evidence.

## Status — stated plainly
**No independent security review has been performed. No security
certification exists. GAEB's security approval (B-11) is an
external gate for production** and a charter responsibility for
the pilot. Nothing in this document upgrades that.
