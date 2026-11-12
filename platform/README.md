# GAEB Modern Platform — standalone production system

The production codebase: a standalone Node.js/TypeScript + PostgreSQL system
with a React frontend. It has **no dependency on any hosted AI or artifact
runtime** and runs entirely on infrastructure you control.

## Layout
- `src/` — API server, auth (scrypt, revocable sessions, RBAC), exact-decimal
  money, Arabic codepage decoding (IBM 420/864, Windows-1256), workflows, and
  the migration engine (`src/migration/`).
- `migrations/` — PostgreSQL migrations `001`–`009`: operational schema,
  estimates, migration evidence chain (batches, run ledger, cumulative control
  totals, rejects, checkpoints, key index), secure mapping approvals, intake
  governance, import jobs.
- `frontend/` — Vite/React/TypeScript UI, English/Arabic with full RTL.
- `tests/` — integration and unit suites executed against real PostgreSQL.
- `tools/` — preflight validator, benchmark, backup/restore, PITR drill,
  health check, SBOM generator, synthetic pilot rehearsal.
- `demo/` — clearly-labelled synthetic demo seed and the PBLBULDG layout.

## Run it (Docker)
From the repository root:

```bash
docker compose up --build
# API on :8080, frontend on :5173
```

The compose stack initializes PostgreSQL with the migrations and the staging
schema. Create the first administrator (there are no seeded users):

```bash
docker compose exec api node dist/src/cli/create-admin.js
```

## Run it (native)
```bash
# PostgreSQL 16 reachable at DATABASE_URL
cd platform && npm install && npm run build
for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
psql "$DATABASE_URL" -f ../migration/reconciled/schema_v2.sql
DATABASE_URL=postgres://… node dist/src/cli/create-admin.js
DATABASE_URL=postgres://… PORT=8080 node dist/src/server.js
cd frontend && npm install && npm run build
API_PROXY=http://localhost:8080 npx vite preview --port 5173
```

## Test
```bash
TEST_DATABASE_URL=postgres://…/gaeb_test npm test
```
The suite (65 tests) runs against real PostgreSQL and covers the full chain:
extract → staging → approval-gated transform → operational data → API →
reconciliation, plus Arabic fidelity, adversarial importer cases, security
negatives (injection, traversal, throttling) and the preflight validator.

## Operating notes
- The platform **never writes to the source IBM i**. Migration is an offline
  extract → transfer → import path that is safe on V6R1.
- Every import is evidence: deterministic batch ids, an append-only run
  ledger, cumulative control totals, and byte-level quarantine of rejects.
- Operational data changes only through mapping approvals bound to an
  authenticated approver, a data class (demo/customer) and the current
  transform definition hash.
- Money is exact decimal end to end; floats never touch a financial figure.

See `../docs/` for architecture, security, runbooks, the pilot package and
the full evidence trail, and `../docs/SCREENSHOTS.md` for the UI gallery.
