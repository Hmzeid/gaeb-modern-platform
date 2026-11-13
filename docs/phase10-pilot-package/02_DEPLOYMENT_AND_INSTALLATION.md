# 02 — Deployment & Installation

## Topology (pilot)
```
                 ┌──────────── GAEB-approved network ────────────┐
 users ──HTTPS──▶ reverse proxy (TLS termination, GAEB cert)
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
        frontend (static)     API service ──── PostgreSQL 16
        (nginx/vite preview    (Node, port 8080   (dedicated volume,
         equivalent)            internal only)     backups off-host)
```
Single-host deployment is supported for the pilot (the reference
`docker-compose.yml` runs db + api + frontend). Multi-host and
high-availability topology is a production decision for GAEB's
infrastructure team (risk RR-06); nothing in the application
prevents it — the API is stateless apart from the database.

## Infrastructure requirements (pilot sizing)
| Component | Minimum | Notes |
|---|---|---|
| Host | 4 vCPU / 8 GB RAM / 100 GB SSD | Sized from the 1M-record scale validation on weaker hardware (1.5 vCPU sandbox) |
| PostgreSQL | 16.x, `pg_trgm` available | Migration 011 installs trigram indexes under a guard if the extension is present |
| TLS | GAEB-issued certificate at the proxy | The app sets strict security headers; TLS terminates at the proxy (RR-01) |
| Backup storage | ≥ 2× database size, off-host | Retention per §09 |
| Network | API and DB ports internal-only; only the proxy is exposed | Extract intake per §05 |

## Two environments, deliberately separate
1. **Demonstration environment** — synthetic data only (the seeded
   demo dataset), used for executive demos, training, and UAT
   dry-runs. It must never receive customer extracts.
2. **Pilot (customer-data) environment** — access-controlled,
   separately credentialed, receives authorized extracts only via
   the §05 process. Separate database, separate backups, separate
   admin accounts. No data moves from pilot to demo.

## Installation (summary; full guide: `docs/pilot-package/GAEB_Configuration_Guide.md`)
1. Provision PostgreSQL 16; create the application database.
2. Apply migrations in order: `platform/migrations/001…011` plus
   the staging schema `migration/reconciled/schema_v2.sql`.
3. Configure environment: `DATABASE_URL`, `PORT`, session and
   cookie settings per the configuration guide. No secrets in the
   repository; inject via the host's secret mechanism.
4. Build and start the API (`npm ci && npm run build && npm start`)
   and serve the frontend build behind the proxy with `/api`
   forwarded to the API service.
5. Create the first administrator with the one-time CLI
   (`dist/src/cli/create-admin.js`); no default users exist.
6. Smoke-verify: health endpoint, login, one read per module.
   (`scripts/smoke-test.sh` automates this where Docker is used.)

## Docker status — stated plainly
`docker-compose.yml` is provided and its services were exercised
natively component-by-component; a full compose run is **NOT
VERIFIED** because no Docker host is available in the build
environment and CI activation is blocked on a repository-owner
credential (see the qualification matrix, §12). The first compose
run on GAEB infrastructure is a pilot-week-1 task with the smoke
script as its checklist.
