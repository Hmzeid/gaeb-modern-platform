# Phase 11 — Operations Handbook (Workstream L)

Consolidates the Phase 10 runbook into the pilot operations
reference. (Full monitoring guide:
`docs/pilot-package/GAEB_Monitoring_and_Alerting_Guide.md`.)

- **Startup/shutdown:** start PostgreSQL → API → frontend proxy;
  shutdown in reverse; verify `/health` after each start.
- **Health checks:** API `/health`; DB connectivity via the
  env-preflight (ENV-06…ENV-10) on demand; Migration Center
  progress for import health.
- **Database maintenance:** weekly `VACUUM (ANALYZE)` on staging
  tables during pilot imports; index presence re-checked by
  preflight (the Phase 11 trigram-index catch is the standing
  lesson: verify, don't assume).
- **Backup verification:** daily logical backup; monthly restore
  drill with fingerprint comparison (the drill, not the backup, is
  the control); retention per charter-approved schedule.
- **Restore:** pg-logical-backup tool path (verified Phases 6, 10,
  11) or pg_basebackup/PITR path (verified Phase 7) by scenario.
- **Monitoring & alerting:** host-level process/disk/health alerts
  to the charter-named destination. **Alert delivery is verified
  only when a test alert is received at that destination** — a
  charter entry condition; configuration alone is not evidence.
- **Incidents:** S1 integrity/security (stop writes/imports,
  preserve audit + backups, notify sponsor + platform lead) ·
  S2 availability (restore service, report in 1 business day) ·
  S3 cosmetic (backlog). Correlation IDs + the audit log are the
  record.
- **Security incidents:** isolate the affected environment,
  preserve forensic copies of logs/backups before remediation,
  GAEB security reviewer leads; charter rollback triggers apply.
- **Capacity:** registry growth is linear in staging + operational
  tables; the Phase 9 scale figures (1M buildings, sandbox floor)
  are the planning baseline; disk alerting at 70%/85%.
- **Performance baselines:** API reads 3–7 ms on demo data;
  paged list p50 ≈ 91 ms at 1M records (sandbox) — pilot-host
  baselines are captured in P0 and replace these.
- **Release deployment & rollback:** per the CI/CD governance
  document's checklist and the rollback procedure above.
- **Handover:** at pilot exit, GAEB IT receives this handbook,
  the preflight tool, backup tooling, and the evidence archive;
  Veebase support terms for the pilot period are set in the charter.
