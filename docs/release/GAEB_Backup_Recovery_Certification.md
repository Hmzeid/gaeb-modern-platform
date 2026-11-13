# GAEB Backup & Recovery Certification (Phase 6, Workstream C)

Executed 2026-11-12 against the real PostgreSQL 16.4 instance, using
PostgreSQL **16.15 client tools** (pg_dump / pg_restore / pg_basebackup —
installed from the Ubuntu 24.04 repositories; the sandbox's embedded server
distribution ships server binaries only). The four recovery levels are kept
separate, per policy.

## 1. Logical backup/restore (pg_dump) — VERIFIED
- Source: the test database holding the full synthetic evidence chain
  (intake, approvals + events, jobs, batches, quarantine, audit, staging).
- `pg_dump -Fc`: 230,972 bytes in 0.55 s; SHA-256
  6d8f2bc1356e3827f30090e1cf13b3faa70ddc4ce77d6c41d7fb5874cccdffe5
  (artifact retained: evidence/phase6/backup-restore/gaeb-logical.dump).
- Integrity: `pg_restore --list` parses the archive (85 entries).
- Restore into a clean database: 19.4 s (row/index rebuild included).
- Verification: all 18 evidence tables fingerprint-MATCH (SHA-256 over
  ordered row content), and the application-level reconciliation of the
  fixture batch re-verified on the restored database (equation holds).
- Log: evidence/phase6/backup-restore/pg-logical-backup.log.
- (Phase 5's tool-level logical restore also remains verified.)

## 2. Physical backup/restore (pg_basebackup) — VERIFIED
- `pg_basebackup` (wal_level=replica, max_wal_senders=10): 827,652 kB in
  3 min 50 s on the shared sandbox disk (~3.6 MB/s write-limited).
- The backup was booted as a standalone cluster on a separate port: recovery
  completed (end-of-recovery checkpoint in its log), and all 18 evidence
  tables / 2,480 rows fingerprint-MATCH the source.
- Log: evidence/phase6/backup-restore/pg-physical-restore.log. The backup
  manifest (per-file checksums, 1.15 MB) and label are retained; the 838 MB
  backup data itself was discarded after verification — it is a reproducible
  artifact, not evidence content.
- Note: a pg_basebackup restore replays to the end of the backup's WAL.
  This is a consistent physical restore, not point-in-time recovery.

## 3. Point-in-time recovery — NOT VERIFIED
No WAL archiving (archive_command / archive library) is configured in this
environment, so recovery to an arbitrary timestamp has not been executed and
is not claimed. Enabling it is a deployment configuration decision.

## 4. Multi-host disaster recovery — NOT VERIFIED
No second host exists in this environment. Streaming replication / failover
has not been executed and is not claimed; it is an infrastructure decision
for GAEB's hosting (see Residual Risk RR-06).

## Measured recovery figures (this environment only)
- Logical restore of the evidence database: ~19 s (2,480 rows).
- Physical restore: cluster boot + recovery ≈ 5 s after the 838 MB copy.
- RPO: backups are point-in-time snapshots — committed data up to the
  snapshot is fully recoverable (RPO 0 relative to the snapshot); the loss
  window between snapshots is a scheduling decision, not measured here.
- These are sandbox measurements on shared hardware, not guarantees.

## Phase 7 addendum (2026-11-12) — PITR VERIFIED; re-executions
- **Point-in-time recovery: VERIFIED on a dedicated drill cluster.**
  WAL archiving enabled (archive_mode=on, file-copy archive_command);
  platform schema applied; base backup taken; transaction A committed;
  recovery target captured; transaction B committed; source stopped;
  the base backup was restored with restore_command + recovery_target_time
  and promoted. Result: **A present, B absent**, restored cluster ready in
  27.4 s (tools/pitr-drill.mjs; evidence/phase7/pitr/pitr-drill.log).
  Scope: this certifies the PITR mechanism and configuration pattern.
  Production PITR still requires archiving enabled on the production host
  (go/no-go checklist).
- Logical backup re-executed: PASS (evidence/phase7/backup/).
- Physical backup re-executed against a quiescent database: PASS
  (evidence/phase7/backup/; an earlier comparison run was invalidated by
  concurrent test-suite mutation and is documented in
  evidence/phase7/backup/INVALID_RUN_NOTE.md).
- Multi-host DR remains NOT VERIFIED.
