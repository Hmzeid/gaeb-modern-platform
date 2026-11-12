# GAEB Configuration Guide (pilot deployment)

Environment variables (API process):
- DATABASE_URL — PostgreSQL 16 connection string (required).
- PORT — API port (default 8080).
- MIG_MAX_UPLOAD_MB — upload cap in MB (default 512); extracts above the cap
  use the streaming file path, never a bigger in-memory buffer.
- API_PROXY — frontend dev/preview proxy target (compose sets it).
- GAEB_API_URL / GAEB_API_TOKEN — used only by the approval CLI client.

Database:
- Apply platform/migrations/*.sql in order, then
  migration/reconciled/schema_v2.sql as the staging schema.
- Roles: the application connects as one role; approvals/imports are
  authorized in the application layer (RBAC), not by DB grants — keep the
  app role's grants to the app/mig schemas only.
- Backups: nightly pg_dump (custom format) + weekly pg_basebackup +
  WAL archiving if PITR is required (archive_mode=on; see the Phase 7 PITR
  drill for the verified configuration pattern).

Security-relevant settings:
- Terminate TLS at the proxy (RR-01); set the session TTL by policy
  (SESSION_TTL in auth config); create the first admin via CLI only;
  layouts are registered by an admin act with --registered-by recorded.
