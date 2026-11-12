# POC Demonstration Runbook

Reproducible demo: IBM i-format extract → import → PostgreSQL staging → validation →
approved transformation → operational tables → GAEB application → reconciliation report.
All demo data is SYNTHETIC and labeled as such. Customer data is never used in the demo.

## Start the stack (Docker Compose)
```bash
docker compose up --build -d        # db (PostgreSQL 16) + api (:8080) + frontend (:5173)
docker compose ps                   # db healthy, api and frontend up
curl http://localhost:8080/health   # {"ok":true}
```
The database initializes itself on first start: operational migrations 001–005
(platform/migrations) then the generated staging schema (schema_v2.sql, 126 tables)
via the initdb mounts in docker-compose.yml.

## Create the first administrator (no seeded users exist, by design)
```bash
docker compose exec api node dist/src/cli/create-admin.js <username> <password>
```

## Optional controlled test data (synthetic)
```bash
docker compose exec -T db psql -U gaeb -d gaeb < platform/demo/seed.sql
```

## Run the demonstration
1. Sign in at http://localhost:5173 as the administrator; create a technical user
   (the migration operator role) via the admin tooling of your environment.
2. Migration Center → choose the synthetic extract `platform/tests/fixture` data set
   (or generate one with the layout in `platform/demo/`), Preview decode: Arabic school
   names decode from IBM420; the duplicate and the corrupted record appear as rejects.
3. Run import → the batch appears with cumulative totals (control 15,308,643 /
   source 22,962,964 for the standard fixture; the delta is the quarantined value).
4. Run import AGAIN with the same file → "already recorded" behaviour: totals and
   staged rows do not change (append-only run ledger).
5. Record mapping approvals (admin): `node dist/src/cli/approve-mapping.js buildings
   --by "Name (role)" --evidence "POC demo approval"` — in the customer POC this step
   is performed only against GAEB-signed mapping approvals.
6. Migration Center → Run transform on the batch → open School Map: the migrated
   buildings are there, with Arabic names intact.
7. Reports → budget utilization CSV downloads with the session token (budget role
   only; the technical role receives 403 — separation of duties is demonstrable).

## CLI alternative (same engine, same database)
```bash
DATABASE_URL=postgres://gaeb:gaeb@localhost:5432/gaeb \
  node platform/dist/src/cli/import-extract.js <extract> <layout.json> \
  --table school_map.pblbuldg --layout-name pblbuldg-v1 --register-layout --registered-by "Demo Admin"
```

## Backup and recovery
```bash
docker compose exec -T db pg_dump -U gaeb -d gaeb > gaeb-backup.sql     # backup
docker compose down -v                                                  # teardown (destroys data)
docker compose up -d db && sleep 5
docker compose exec -T db psql -U gaeb -d gaeb < gaeb-backup.sql        # restore
```

## Honesty notes
- `docker compose up` was validated by configuration review and by executing every
  service's build/run steps natively in the development sandbox (PostgreSQL 16.4,
  API, frontend build); the compose stack itself must be smoke-tested once on the
  target/demo machine before the customer session.
- The fixture extract is synthetic. The same screens and CLI accept a real GAEB
  extract with no code change — only a registered layout and signed mapping approvals.
