# Phase 11 — Environment Qualification (Workstream D)

## Automated preflight
`platform/tools/env-preflight.mjs` executes 16 checks against a
target deployment and emits a JSON report: OS, CPU, memory, disk,
Node version, PostgreSQL 16 verification, pg_trgm availability,
trigram index presence, migration-schema completeness, app↔DB
clock skew, API health, API security headers, backup-directory
writability — plus three MANUAL items (TLS chain, network
segmentation/firewall, secrets injection) that no application-tier
tool can attest and that require infrastructure sign-off.

## Executed run (sandbox, 2026-11-13)
`evidence/env-preflight-sandbox.json` — **12 PASS, 0 WARN, 0 FAIL,
3 MANUAL.** The run earned its keep twice on its first execution:
1. It caught that the demo database was missing one of the three
   trigram indexes (`idx_buildings_blcd_trgm`). The idempotent
   index creation was applied to both sandbox databases and the
   re-run is clean. (The migration itself is `IF NOT EXISTS`
   throughout; how one index was absent in a database migrated
   during a sandbox restart cycle could not be reconstructed, and
   is recorded as an environment-hygiene note — which is precisely
   why the preflight checks index presence rather than trusting
   migration history.)
2. Its first version probed `/api/health` (404) — the platform's
   health route is `/health`. The tool was corrected; a wrong
   probe would have failed every healthy deployment.

## Docker
Docker is not available in the build sandbox (checked again
2026-11-13). Container validation is therefore **NOT VERIFIED**;
the native deployment path is what this preflight qualifies.
On GAEB infrastructure, the first compose run + `scripts/smoke-test.sh`
is a charter entry-condition task (P0), after which this document
is re-issued with the container results.

## Use on GAEB infrastructure
Run with `DATABASE_URL`, `API_URL`, `BACKUP_DIR` set for the pilot
host; file the JSON with the P0 evidence; the three MANUAL items
are attested by GAEB IT in the same record.
