# Backup/Restore Re-verification — Phase 10 build (2026-11-13)

Tool: platform/tools/pg-logical-backup.mjs (pg_dump logical backup,
restore into a scratch database, per-table fingerprint comparison,
application-level reconciliation check on the restored database).

## Run 1 — test database (full verdict path)
- Source: gaeb_test · dump 232,264 bytes · sha256
  04b566d083c88ab66fa7842c1d73087f244833584e577372e2f9fe21c82b2cc7
- Tables compared: 18 · mismatches: 0
- Application check on restored DB: fixture batch source=5,
  loaded=2, quarantined=3, reconciliation equation TRUE
- **Verdict: PASS**

## Run 2 — demonstration database (fingerprint path)
- Source: gaeb_docs · dump 216,458 bytes · sha256
  ebb61a6b0571c05c9a8003e8cbb1b6bc9f9bb144687e4772fa6660d5227dd719
- Tables compared: 18 · mismatches: 0 (incl. app.buildings 7 rows,
  app.governorates 4 rows, school_map.pblbuldg 3 rows)
- The tool's fixture-specific application check does not apply to
  this database (it asserts a test-suite fixture batch); the
  fingerprint comparison is the substantive verification here.
- **Verdict: PASS (fingerprint scope)**
