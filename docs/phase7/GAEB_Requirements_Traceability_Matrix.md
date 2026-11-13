# GAEB Requirements Traceability Matrix (Phase 7, Workstream L)

Sources: the POC business/process analysis (docs in this repo), the six-module
scope, and the migration directives. No BRD document was delivered by GAEB;
rows are traced to the analyzed legacy behaviour, and every row's status is
stated in the sanctioned vocabulary. "Verified" always means executed
evidence exists — never code presence alone.

| # | Requirement | Implementation | Automated test | Evidence | Customer UAT | Status |
|---|---|---|---|---|---|---|
| R-01 | Migrate School Map buildings with Arabic names intact | transform "buildings" | E2E + fidelity | phase5 rehearsal log | UAT-13/15 | VERIFIED (mechanism; real data BLOCKED) |
| R-02 | Governed intake with staged evidence | intake pipeline (007) | E2E | phase4 pack | UAT-04/05/24 | VERIFIED |
| R-03 | Approvals independent, identity+hash bound | approvals (006) + gate v3 | E2E lifecycle + forgery | test log | UAT-07/08/29 | VERIFIED |
| R-04 | Exact financial arithmetic, no float drift | money.ts decimal | unit | test log | UAT-16 | VERIFIED |
| R-05 | Certificate lifecycle with SoD | workflow.ts | E2E-adjacent unit | test log | UAT-17 | VERIFIED (mechanism) |
| R-06 | Certificate NET incl. all deduction kinds | workflow + transform | partial | BD-04 open | UAT-16 | BLOCKED (B-08) |
| R-07 | Budget appropriations module | schema + API | unit | B-01 | — | BLOCKED (no DDS) |
| R-08 | Estimates/BOQ with catalogue integrity | 002 schema | unit | B-13 | — | BLOCKED (no item master) |
| R-09 | Tender lifecycle + deadline rule | workflow CHK5DAYS flagged | unit | BD-06 open | UAT-18 | NOT VERIFIED (rule unconfirmed) |
| R-10 | Expropriation decree gate | workflow REMV01->02 | unit | test log | UAT-18 | VERIFIED (mechanism) |
| R-11 | TOT compensation semantics | deliberately unmapped | — | BD-01 open | — | BLOCKED (decision) |
| R-12 | Streaming resumable import at scale | stream + persistChunk | E2E + benchmarks | phase5/7 perf | UAT-25/26 | VERIFIED |
| R-13 | Reconciliation with three separate outcomes | reconcile + report | E2E | report samples | UAT-13/14/30 | VERIFIED |
| R-14 | Backup/restore of the full evidence chain | pg tools + drill tools | executed drills | phase6/7 evidence | UAT-28 | VERIFIED (logical+physical; PITR see R-18) |
| R-15 | RBAC with separation of duties | auth.ts + requirePerm | E2E 403 drills | RBAC matrix | UAT-01..03 | VERIFIED |
| R-16 | Arabic fidelity incl. search normalization | arabic.ts | fidelity suite | fidelity report | UAT-15 | VERIFIED (425 excluded, B-05) |
| R-17 | Docker deployment | compose + smoke script | script written | — | — | NOT VERIFIED (no Docker host) |
| R-18 | Point-in-time recovery | WAL archiving drill | pitr-drill.mjs | evidence/phase7/pitr/ | UAT-28 (extended) | VERIFIED (drill cluster) |
| R-19 | CI enforcement | ci/ workflows + patch | — | cicd evidence | — | BLOCKED (token scope) |
| R-20 | Customer UAT | 30-case pack | pack prepared | uat pack | all | NOT STARTED (B-12) |
| R-21 | Independent security approval | evidence index | self-assessment | security docs | — | NOT STARTED (B-11) |
| R-22 | Real GAEB data migration | full pipeline | rehearsal (synthetic) | — | pilot | BLOCKED (no extracts) |

## Phase 8 addendum (2026-11-12)
| R-23 | Live import monitoring (progress, checkpoint, throughput, ETA-as-estimate) | progress endpoint + Migration Center live panel (2s polling) | E2E progress assertions | live endpoint output sampled in phase8 evidence | UAT-25 (extended) | VERIFIED |
| R-17 update | Docker deployment | unchanged implementation | GitHub audit: runners were never the blocker; workflow files cannot be pushed with the OAuth token (fresh rejection captured Phase 8) | docs/phase8/GITHUB_CICD_AUDIT.md | — | NOT VERIFIED (blocked upstream by R-19) |
| R-19 update | CI enforcement | workflows validated; activation attempted via push AND Contents API this phase — both refused by GitHub for the OAuth token; SSH transport blocked by sandbox egress | — | evidence/phase8/cicd/ + audit doc | — | BLOCKED (owner credential action, 3 routes documented) |
