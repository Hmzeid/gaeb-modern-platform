# GAEB Data Migration — Evidence Index

| Claim | Evidence |
|---|---|
| End-to-end pipeline works | platform/tests/integration.test.ts (real PostgreSQL E2E) + docs/TEST_LOG_2026-11-12.txt (58/58) |
| Checkpoint resume is exact | E2E streaming section (crash after chunk 1 → checkpoint 500 → resume; totals exact) |
| Retries never double-count | Run-ledger tests + E2E retry assertions |
| Duplicates preserved, not merged | Adversarial suite (conflicting duplicate test) + E2E cross-chunk test |
| Approvals are identity/hash-bound | E2E approvals lifecycle (403/400/422 drills, forgery test, append-only events) |
| Formats supported honestly | docs/EXPORT_FORMATS.md + format dispatch tests |
| Scale | docs/BENCHMARK.md; evidence/phase5/benchmark.log (to 1,012,418 records) |
| Arabic fidelity | docs/validation/GAEB_Arabic_Data_Fidelity_Report.md + tests/arabic-fidelity.test.ts |
| Reconciliation definitions | docs/validation/GAEB_Reconciliation_Methodology.md |
| Pilot procedure rehearsed | evidence/phase5/pilot-rehearsal.log (synthetic, labeled) |
| Backup/restore | evidence/phase5/recovery/ (logical, Phase 5 tool); evidence/phase6/backup-restore/ (pg_dump + pg_basebackup) |
| Real GAEB data migrated | **NO EVIDENCE — not yet performed. Blocked on GAEB extracts.** |
