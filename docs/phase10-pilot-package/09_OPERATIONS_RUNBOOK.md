# 09 — Operations Runbook

## Monitoring (what exists, what the pilot host must add)
The application exposes a health endpoint and per-request
correlation IDs; the Migration Center shows live import progress.
The detailed guide is `docs/pilot-package/GAEB_Monitoring_and_Alerting_Guide.md`.
Pilot host responsibilities: process supervision (service restart
on failure), disk/health alerting to a named destination, log
retention per GAEB policy. **Alert delivery is NOT VERIFIED** until
a real destination receives a real alert on the pilot host — it is
a P0 checklist item, not a claim.

## Backup, restore, retention
- **Logical backup** (pg_dump) — re-verified on the Phase 10 build
  2026-11-13: restore into a scratch database, 18/18 tables
  fingerprint-identical, application reconciliation equation holds
  on the restored database. Evidence:
  `evidence/backup-restore-rerun.md`.
- **Physical backup** (pg_basebackup) and **PITR** — verified in
  Phases 6–7 against this schema line (restore booted standalone;
  PITR drill recovered to a target transaction boundary).
- **Retention (proposed, GAEB to confirm):** daily logical backups
  retained 30 days, weekly physical retained 8 weeks, one monthly
  retained 12 months; backups stored off-host; a restore is drilled
  monthly — a backup that has never been restored is a hope, not a
  control.
- **Multi-host DR:** NOT VERIFIED / GAEB infrastructure decision
  (RR-06). RPO/RTO targets are production-gate items for GAEB to
  set; the pilot runs single-host with verified restore.

## Rollback procedure (release)
1. Announce the rollback window; stop writes (maintenance mode at
   the proxy).
2. Take a pre-rollback logical backup (never roll back blind).
3. Deploy the previous release tag (git) and, if the release
   included migrations, restore the pre-release database backup —
   migrations are forward-only; database rollback = restore.
4. Re-run the smoke verification; reopen writes; file the incident
   note with correlation IDs.

## Incident response (pilot)
Severity by impact: S1 data integrity or security suspicion →
stop imports/writes, preserve audit log + backups, notify GAEB
sponsor + Veebase platform lead immediately. S2 module unavailable
→ restore service, file report within one business day. S3 cosmetic
→ backlog. Every incident records correlation IDs from the affected
requests; the audit log is the system of record for who did what.

## Operational ownership
Application support: Veebase during the pilot (named contacts in
the pilot charter). Infrastructure, network, certificates, and
backup storage: GAEB IT. Data decisions: GAEB data owner. This
split is a proposal until the pilot charter signs it.
