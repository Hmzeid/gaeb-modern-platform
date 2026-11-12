# GAEB Operational Acceptance Pack (Phase 6, Workstream I)

Consolidates the operational documents and the operational tests actually
executed. 24/7 readiness is NOT claimed: it requires a staffing/support
arrangement agreed separately (see the escalation matrix below).

## Documents
| Need | Document |
|---|---|
| Deploy | docs/release/GAEB_Deployment_Runbook.md; docs/pilot/GAEB_Pilot_Deployment_Runbook.md |
| Roll back | docs/release/GAEB_Rollback_Runbook.md |
| Daily operations | docs/release/GAEB_Operations_Manual.md |
| Backup schedule | GAEB_Backup_Recovery_Certification.md (nightly pg_dump + weekly base backup recommended for pilot) |
| Restore procedure | Same certification doc + platform/tools/pg-logical-backup.mjs / backup-restore.mjs |
| Incident response | Operations Manual §incidents: stop imports (jobs can be cancelled), preserve evidence (append-only tables), escalate with batch id + reconciliation report |
| Import recovery | Checkpoint resume is automatic on re-run; failed jobs return to QUEUED from FAILED/RECOVERING states |
| Database maintenance | VACUUM/ANALYZE cadence in Operations Manual; staging growth tracked via metrics endpoint |
| Access administration | CLI admin creation + named accounts only (Deployment Runbook §3) |
| Audit evidence | Audit log + approval/intake event tables; evidence index in docs/delivery/GAEB_Data_Migration_Evidence_Index.md |

## Operational tests executed
| Test | Result | Evidence |
|---|---|---|
| Application restart | PASS | server restarts throughout test history; sessions are database-backed |
| Database restart mid-evidence | PASS | Phase 4 restart-recovery (evidence/phase4/recovery/) |
| Worker interruption | PASS | E2E crash-after-chunk resume; accidental mid-benchmark kill left exactly 35 committed chunks, rerun completed cleanly |
| Failed-import recovery | PASS | E2E resume from checkpoint with exact totals |
| Backup restoration | PASS | Phase 6: pg_dump + pg_basebackup restores fingerprint-verified |
| Health-check recovery | PASS (native) | /health used by every E2E run; Docker-level check NOT VERIFIED with the stack |
| Alert validation | NOT EXECUTED | No alerting stack exists in the sandbox; pilot checklist requires disk/health alerts on the pilot host |

## Support escalation matrix
L1 GAEB operator → runbook procedure + batch/reconciliation references.
L2 Veebase delivery engineer → import/reconciliation/approval issues.
L3 Veebase platform + GAEB IBM i admin jointly → source-format/CCSID issues
(never resolved by editing data by hand; corrections flow through
resubmission or a new extract).
