# Production Architecture — GAEB Modern Enterprise Platform

## Layers
1. **Client** — React/TypeScript POC client (existing) is the functional reference; production
   frontend work (Milestone 3+) re-targets it at the standalone API below. No Hatch runtime.
2. **API (platform/)** — standalone Node.js/TypeScript service (Express), deployable anywhere:
   customer on-prem, private cloud, or air-gapped (container images transferred offline).
   - `src/auth.ts` — scrypt password hashing, opaque revocable sessions (SHA-256 at rest), RBAC
     with separation of duties.
   - `src/money.ts` — exact decimal finance (decimal.js), packed/zoned decimal decoders.
   - `src/arabic.ts` — table-driven IBM420/IBM864/Windows-1256 decoders (glibc charmap provenance).
   - `src/workflow.ts` — tender stage machine, certificate certify→bill→authorize→pay chain,
     expropriation decree gate, CHK5DAYS working-day rule (flagged pending B-04).
   - `src/server.ts` — REST API; every mutation writes `app.audit_log`.
3. **Database (PostgreSQL)** — two layers, deliberately separate:
   - Operational model `platform/migrations/001_operational_schema.sql` (schema `app`):
     NUMERIC(19,4) money, constraints enforcing gates (e.g. post-decree rows must carry
     decree number/date/Gazette reference).
   - Staging/lineage layer `migration/reconciled/schema_v2.sql`: legacy-shaped tables
     (126) preserving natural keys and source lineage for the migration engine.
4. **Migration engine** — design in the blueprint; the reconciled staging layer, mapping
   register v2 (with approval states) and coverage matrix are its working inputs.
   Live IBM i extraction is NOT yet implemented (Blocker B-06 — no host access provided).

## Deployment
`docker-compose.yml` at repo root: PostgreSQL 16 + API. Migrations run on first DB init.
First admin is created explicitly (`npm run create-admin`) — the system seeds nothing.

## Status (honest)
Milestone 1 complete on this branch; Milestone 2 scaffold implemented and unit-tested;
Milestones 3–6 not complete. See docs/MILESTONE_REPORT.md for the itemized status.
