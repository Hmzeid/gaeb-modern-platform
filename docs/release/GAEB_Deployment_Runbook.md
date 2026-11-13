# GAEB Deployment Runbook (release candidate)

## Topology
Docker Compose: `db` (postgres:16, initdb applies platform/migrations/*.sql in
order + the staging schema), `api` (Node, port 8080), `frontend` (Vite preview,
port 5173, proxies to the API). TLS is terminated at the hosting reverse proxy
in front of the frontend/API (remediation R-01) — the app itself serves HTTP on
the internal network only.

## Deploy
1. `docker compose build && docker compose up -d`
2. Create the first admin (no seeded users exist): run the platform CLI
   `create-admin` inside the api container with a strong password.
3. Create operator (technical) and approver (budget) accounts; verify role
   separation by attempting an approval as the operator (must be 403).
4. Run the smoke test: `scripts/smoke-test.sh` — all 12 checks must pass; file
   the output as the deployment evidence for this release.
5. Register layouts (admin act) before any import; record demo/customer mode
   approvals per the acceptance procedure.

## Backup
`pg_dump` the database (the smoke script exercises this); store dumps with the
same confidentiality class as the extracts (Transfer Protocol). Backup includes
mig.* evidence tables — they are the migration's audit record.

## Configuration
DATABASE_URL, PORT, MIG_UPLOAD_DIR, MIG_MAX_UPLOAD_MB (default 512). No secrets
in the repository; inject via the host's secret mechanism.
