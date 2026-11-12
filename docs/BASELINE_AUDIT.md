# Baseline Audit — Existing POC Application (Milestone 1)

Scope: the application as committed on `main` (React/TS client, Hatch-SDK server, SQLite).
Method: direct source inspection of `package.json`, `server/src/schema.ts`,
`server/src/seed.ts`, `server/src/actions.ts`, plus the migration package.
This audit distinguishes what the POC actually does from what earlier summaries claimed.

## What genuinely works (verified in the POC build)

- Real login with 5 roles and server-side session handling (within the Hatch runtime).
- CRUD for the six modules' core entities, computed certificate totals, tender detail
  with offers, budget allocated/spent tracking, bilingual EN/AR UI with RTL.
- Migration Center demo: staging rows load into modern tables with duplicate/code
  rejection reasons and a job log. **It is a simulation over seeded staging data —
  it is not connected to any IBM i system and must never be presented as one.**

## Critical defects (block production)

1. **Runtime lock-in.** `package.json` depends on `@hatch/space-sdk` via
   `file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz` — a local path inside
   Meta's development environment. The app cannot be installed or run by the customer.
   → Milestone 2 replaces it with the standalone `platform/` backend.
2. **Weak password hashing.** `seed.ts` hashes passwords with a single SHA-256 pass over
   `gaeb::<password>` — unsalted, fast, and trivially brute-forced. → Replaced by scrypt
   (memory-hard) in `platform/`; Argon2id support is a configuration option where the
   native module is available.
3. **Hardcoded demo credentials in execution path.** admin/admin123, budget/budget123,
   contracts/contracts123, technical/tech123 are seeded by default. → The standalone
   backend seeds **no** users; the first admin is created by an explicit CLI command.
4. **Financial values in floating point.** The SQLite schema uses `real` for plot_area,
   budget, allocated, spent and every amount column, and JS `number` arithmetic in
   actions. → PostgreSQL NUMERIC + decimal.js in `platform/`; see
   `platform/src/money.ts` and its tests.
5. **No standalone database story.** The operational schema is SQLite (app.db) while the
   generated PostgreSQL DDL describes the *legacy-shaped* tables; the two were never
   reconciled. → `platform/migrations/` carries the operational PostgreSQL schema;
   `migration/reconciled/schema_v2.sql` is the staging/lineage layer.

## Significant gaps (not defects of honesty, but of completeness)

- Business logic is CRUD-level: tender stages are a status field, not an enforced
  workflow; certificate "paid" is a status, not a payment process; expropriation has
  no decree gate; estimates have no draft/reviewed separation; CHKDIG/CHK5DAYS are
  not implemented. The production backend implements the decree gate, certificate
  math and workflow transition rules first; the rest are tracked in the coverage
  matrix (30 of 502 legacy objects partially implemented, 0 verified).
- No automated tests, no CI, no OpenAPI specification, no backup/restore tooling
  existed on `main`. Milestone 1 adds CI and the first test suites.
- Migration percentages shown on the POC dashboard are presentation values, not
  measured migration state. They are removed from any production surface; the
  coverage matrix is the only status source.

## Verdict

The POC is a sound functional skeleton and an excellent requirements artifact.
It is **not** production software. Statuses as of this audit:
code implementation — partial; technical tests — started (M1); live IBM i integration —
not started (no access); business equivalence — not verified; security approval —
not granted; customer acceptance — not started; production deployment — not authorized.
