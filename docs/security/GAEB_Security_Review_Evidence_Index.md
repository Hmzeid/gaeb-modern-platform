# GAEB Security Review — Evidence Index (for GAEB's authorized reviewers)

| Topic | Evidence |
|---|---|
| Threat model (STRIDE) | docs/security/GAEB_Threat_Model.md |
| RBAC matrix (from code) | docs/security/GAEB_RBAC_Matrix.md |
| Self-assessments | docs/security/GAEB_Security_Assessment.md; GAEB_Phase6_Security_Assessment.md |
| Remediation + residual risk | GAEB_Remediation_Register.md; GAEB_Residual_Risk_Register.csv |
| Approval integrity tests | platform/tests/integration.test.ts (approvals lifecycle, forgery, revocation, SoD) |
| Authentication | platform/src/auth.ts (scrypt, opaque revocable sessions) |
| Upload controls | platform/src/server.ts upload handlers (streamed, capped, 0600, hashed) |
| Audit trail | app.audit_log + mig.mapping_approval_events + mig.intake_events (append-only semantics) |
| Data handling rules | docs/customer/GAEB_Data_Transfer_Protocol.md |
| Backup integrity | evidence/phase6/backup-restore/ (dump + base backup, fingerprint-verified restores) |
| Known gaps (declared) | B-11 security requirements outstanding; RR-01…RR-06; Docker execution unverified |

Reviewers: every claim above resolves to a file or an executed log in this
repository. Anything not listed here is not claimed.
