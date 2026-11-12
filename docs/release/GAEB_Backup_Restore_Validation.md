# GAEB Backup / Restore Validation (Phase 5, Workstream I)

Executed 2026-11-12 with `platform/tools/backup-restore.mjs`:
- Logical export of 17 tables (all mig.* evidence tables, app.users,
  app.audit_log, app.governorates, app.buildings, one staging table) to JSONL
  with per-table row counts and SHA-256 fingerprints.
- Restore into a FRESH database with the full migration set applied, in
  FK-safe order, followed by count + fingerprint comparison per table.

Results:
- Against the recovery database: PASS (evidence/phase5/recovery/backup/).
- Against the full test database (1,205 staging rows, approvals + events,
  intake, jobs, audit): PASS — every table's fingerprint matched
  (evidence/phase5/recovery/backup-restore-gaeb-test.log). Duration ~96 s
  for the row-by-row drill restore; this is a validation tool, not the
  production backup mechanism.

Scope honesty:
- A database RESTART was separately verified (Phase 4): batches, totals, and
  quarantine identical across a real PostgreSQL restart.
- A physical pg_dump/basebackup cycle is NOT verified here: the sandbox's
  PostgreSQL distribution ships no pg_dump binary. The Compose deployment's
  backup step (smoke test check) covers it on a Docker-capable host.
- Disaster recovery beyond a single-host restore (multi-host failover,
  point-in-time recovery) is NOT VERIFIED and not claimed.
