# GAEB Rollback Runbook

## Application rollback
1. Stop the stack (`docker compose down`, volumes preserved).
2. Check out the previous release commit; rebuild; `docker compose up -d`.
3. Migrations are additive (CREATE IF NOT EXISTS / new files only); a code
   rollback does not require a schema rollback. If a release added a migration
   whose objects the old code cannot tolerate (none to date — new tables are
   ignored by older code), restore from the pre-deploy dump instead.

## Data rollback (migration batches)
- A batch is evidence, not a transaction to undo socially: to reverse a
  transform, delete the operational rows carrying the batch's lineage keys
  (buildings.legacy_blcd / certificates.legacy_key / expropriation
  migration_key) in a reviewed SQL session, and record the reversal in the
  intake pipeline as a 'rejected' transition with the reason. Staging and
  quarantine rows are NEVER deleted — they are the audit trail of what arrived.

## Restore drill (executed at the data layer)
`platform/tools/restart-recovery.mjs` verifies batch/quarantine persistence
across a PostgreSQL restart (PASS, 2026-11-12, evidence/phase4/recovery/).
A full pg_dump → drop → restore drill is part of the smoke test on the
Docker-capable host and remains outstanding until that run exists.
