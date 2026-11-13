# Milestone Report — Production Upgrade, Session 2026-11-12

Branch: `production-upgrade`. This report states only what was actually done and verified
in this session. The seven production statuses (directive §19G):

1. **Code implementation complete — NO (partial).** Milestone 1 complete; Milestone 2
   scaffold implemented (auth, money, Arabic, workflow, API core, operational schema).
   Milestones 3–6 remain.
2. **Technical tests complete — NO (started, passing).** 17 automated tests executed and
   passing (docs/TEST_LOG_2026-11-12.txt). API/DB integration tests not run — no
   PostgreSQL instance exists in this build environment; docker-compose is provided for
   the target environment.
3. **Live IBM i integration verified — NO.** No host access (B-06).
4. **Business equivalence verified — NO.** Rules implemented from source evidence are
   unit-tested; equivalence needs legacy reference results (B-02/B-03/B-04/B-08).
5. **Security approval complete — NO.** Baseline implemented; review not performed (B-11).
6. **Customer acceptance complete — NO.** (B-12)
7. **Authorized production deployment complete — NO.**

## Milestone 1 — Baseline audit and critical corrections: DONE
- Baseline audit of the POC (docs/BASELINE_AUDIT.md): confirmed Hatch SDK local-path
  dependency, SHA-256 password hashing, seeded demo credentials, REAL/float money.
- Inventory reconciled (docs/DISCREPANCY_REPORT.md): 135 PF definitions = 125 distinct
  members; v1 DDL had 2 duplicate table names (a silent data-loss defect); INV001PF has
  genuinely conflicting definitions (B-02); 39 duplicate field instances merged with lineage.
- Corrected artifacts: schema_v2.sql (126 tables), mapping_register_v2.csv (1,068 rows,
  approval states), coverage_matrix.csv (502 objects: 30 partially implemented,
  472 not implemented, 0 verified).
- CI workflow added (tests + schema determinism + secret scan).

## Milestone 2 — Standalone PostgreSQL application: SCAFFOLD DONE, APP PORT PENDING
- platform/ backend: independent Node/TypeScript, Express + pg + decimal.js only.
- Operational PostgreSQL schema with NUMERIC money and gate constraints.
- scrypt auth, revocable sessions, RBAC + separation of duties; no seeded users.
- Workflow engines: tender stages (no skipping), certificate chain (paid requires a
  payment reference), expropriation decree gate, CHK5DAYS (flagged, B-04).
- Arabic decoders: IBM420/IBM864/Windows-1256 table-driven; IBM425 fails loudly (B-05).
- Docker Compose reference deployment + Dockerfile + .env.example.
- PENDING: porting the full React client to this API; estimates draft/reviewed split;
  remaining module depth (see coverage matrix).

## Milestones 3–6: NOT STARTED in this session
Business-function completion, the live migration engine (extraction connectors),
enterprise hardening (SSO/MFA, monitoring, backup/restore drills), and acceptance
preparation all remain, gated on the blockers in docs/BLOCKERS.md where noted.

## Defects found and fixed in this session
- v1 DDL duplicate table names (D-2) — fixed by generator v2.
- iconv-lite lacks IBM420/425/864 — replaced with generated glibc-charmap tables.
- scrypt memory limit — maxmem raised explicitly.
- Test-environment issues (asset copying, glob) — fixed in build scripts.

## Addendum — Session 2026-11-12 (continued)

- **Estimates module implemented** (Milestone 3, first slice): migration
  `platform/migrations/002_estimates.sql` (catalogue, estimates, estimate_items,
  estimate_revisions); catalogue-only enforced by a NOT NULL FK to the catalogue —
  the structural equivalent of the legacy PMPITMAR restriction; draft/reviewed/approved
  workflow with reviewer ≠ approver permissions; revision snapshots on return-for-correction;
  API endpoints for catalogue, estimate creation (server-side exact totals with catalogue
  price snapshots), listing, and transitions. 4 new tests — **suite now 21/21 passing**.
- **Frontend port started**: `platform/frontend/` — standalone Vite/React/TypeScript client
  (login, dashboard counts, certificate create + workflow advance, EN/AR with full RTL
  switch), build-verified (`vite build` clean, 147.75 kB bundle). It talks only to the
  standalone API. Remaining screens (school map, budget, tenders, real estate, migration
  center) are not yet ported — the POC client remains the functional reference for those.
- **PostgreSQL integration still NOT verified**: this build sandbox cannot run PostgreSQL
  (root-only environment; the database refuses root and the sandbox blocks the ownership
  change it requires). No workaround was forced. Verification path: run the committed
  docker-compose stack on any standard host — `docker compose up`, `npm run migrate`,
  `npm run create-admin` — then exercise login → certificate → transition → paid.
  Status 2 (technical tests) remains "started" until that run is evidenced.

## Addendum 2 — Session 2026-11-12 (continued)

- **Migration engine, offline path implemented** (Milestone 4, first slice):
  `platform/src/migration/engine.ts` — fixed-width extract importer for the V6R1-safe
  route (customer-side extract → transfer → import; never writes to the source).
  Per-field decoding (char with per-field encoding, packed, zoned), duplicate-key and
  undecodable-record quarantine with reasons and raw hex preserved, checkpoint/resume
  with idempotent re-runs, SHA-256 source fingerprint, and exact-decimal control totals
  computed over both loaded records and all parseable records so reconciliation deltas
  are visible rather than hidden. CLI: `npm run import-extract`. 4 tests on a synthetic
  fixture (generated data only) — **suite now 25/25 passing**. Not yet done: DB loading
  into the staging schema (needs the PostgreSQL verification environment), journal-based
  CDC, and the mapping-studio UI.
- **API completed for the remaining modules**: Budget allocations (with exact available
  balance = allocated − committed − spent), Tenders (create + stage advancement through
  the enforced machine), Real Estate (case creation + decree recording through the
  REMV gate, requiring realestate.approve).
- **Frontend now covers all six modules**: tabbed client — Dashboard, Certificates,
  School Map (buildings), Budget, Tenders (with stage advancement), Real Estate
  (with decree recording) — EN/AR with RTL. Production build verified (154.52 kB).
  Remaining frontend depth: estimates screens, catalogue management, migration center UI,
  reports — tracked, not yet built.

## Addendum 3 — Session 2026-11-12 (continued)

- **Migration persistence layer implemented**: `mig` schema (batches, rejects, job_state)
  in migration 003; `platform/src/migration/load.ts` builds parameterized staging inserts
  with lineage columns (_batch_id, _raw_hex) and persists batch summary + rejects +
  records in one transaction. SQL builders are unit-tested (including injection-refusal
  tests); the executor runs only against a live database. **Suite now 29/29 passing.**
- **Reports (first set)**: budget utilization by fiscal year and certificate summary by
  status, aggregated in SQL over NUMERIC columns and returned as exact strings, plus a
  CSV export of budget utilization. PDF/Excel report generation is not yet implemented.
- **Frontend**: Estimates tab (catalogue management + catalogue-only estimate creation +
  review/approve/return actions) and Reports tab added. Build verified (159.79 kB).
- Still unverified until a PostgreSQL host exists: every DB-backed path end-to-end.
  The unit suite covers logic, builders and workflows — not live SQL execution.

## Addendum 4 — Review fixes (commit after 08ea389), 2026-11-12

All eight findings from the review of 08ea389 are addressed and evidenced:

1. **Lineage reconciled with the real schema** — gen_ddl_v2 now emits _batch_id,
   _source_offset, _raw_hex on all 126 staging tables + a unique index on
   (_batch_id, _source_offset). Design: docs/LINEAGE.md.
2. **CLI is the full pipeline** — one command: parse → decode/validate → staging
   insert → quarantine → checkpoint → reconciliation printout (single client,
   single transaction; --report-only retained).
3. **Single-connection transactions** — persistImport runs BEGIN..COMMIT on the one
   client the CLI opens; the integration test drives it the same way.
4. **Checkpoints persisted in mig.job_state** and restored per run; batch ids are
   deterministic (file SHA-256); rejects are unique on (batch_id, record_offset).
   Engine checkpoint semantics fixed: offsets advance for quarantined records too
   (previously only for loaded ones — found by the integration test).
5. **Incomplete trailing records are quarantined** with byte counts, never ignored.
6. **Staging → operational loading exists and is approval-gated** — transform.ts
   refuses to run unless every mapped field is Approved in the mapping register
   (the production register is pending, so the real buildings transform correctly
   refuses today; the integration test proves both the refusal and, with an approved
   fixture register, the load into app.buildings, idempotently).
7. **Integration tests against real PostgreSQL 16.4 — EXECUTED AND PASSING**
   (docs/INTEGRATION_LOG_2026-11-12.txt): full chain extract → parser → staging →
   transform → operational tables → live API → reconciliation, including duplicate
   records, a corrupt record, a truncated tail, a retry (nothing re-inserted), a
   poisoned-record rollback (no partial batch), and exact numeric reconciliation
   (control 15,308,643 = staged SUM; source 22,962,964; delta = quarantined value).
   Executing the generated DDL also exposed two real generator defects — a legacy
   field named NOT (reserved word) and one named W# (# in identifier) — both fixed
   in the generator with identifier quoting.
8. **Report authorization enforced** (reports.finance on budget reports/CSV;
   technical role receives 403 in the integration test, budget role 200) and the
   frontend CSV download now sends the session token (fetch + blob) instead of a
   bare link.

Full suite with the integration test enabled: see the log (unit + integration).
Actual customer migration remains UNVERIFIED — all fixtures are synthetic.

## Addendum 5 — Real-Data Migration POC & Acceptance Readiness (2026-11-12, second release)

Phase 1 reliability: batch totals are now cumulative and retry-proof — an append-only
run ledger (mig.batch_runs) + mig.batch_totals; a retry that loads 0 records changes no
total (asserted live). Checkpoint, records, rejects, and batch results commit in ONE
transaction on ONE connection. Mapping approvals are authenticated DB records bound to
the transform definition's hash (approver, timestamp, evidence) — the CSV-prefix check
is gone; a tampered definition fails the hash and refuses. Layouts are structurally
verified on every run and hash-checked against mig.layouts in DB mode. Delimited
exports are a distinct import path: CPYTOIMPF turns packed fields into decimal TEXT,
and the importer treats them that way (docs/DATA_REQUEST_PACK.md §5 explains the
distinction to the customer).

Phase 2: transforms now cover buildings, tenders (PBYTENDR), expropriation
(REV01→cases, pre-decree, TOT deliberately unmapped), and certificates (INV001PF
header load, gated on B-02). Budget transform: honestly BLOCKED on B-01 (CBABDALW is
an allowances file, not the appropriations model). Estimates transform: BLOCKED on new
blocker B-13 — the item-master physical file was never identified in the delivery.

Phase 3: Migration Center is live in the app — inventory (502 objects), upload,
preview decode, import, batches with cumulative totals, quarantine with auditable
resubmission, approval-gated transform, approvals register. Verified against the
running API (budget role gets 403; transform endpoint idempotent).

Phase 4: docker-compose gains the frontend service + staging-schema init mount;
docs/DEMO_RUNBOOK.md + synthetic seed + demo layout. Docker is not installed in the
dev sandbox: compose YAML validated and every service's steps executed natively;
a compose smoke test on the demo machine is still required (stated in the runbook).

Phase 5: docs/DATA_REQUEST_PACK.md — bilingual EN/AR pack ready to send: exact School
Map files, B-01/B-02/B-13 asks, CCSID/metadata/control-total requirements, export
formats with the CPYTOIMPF caveat, V6R1 example commands labeled as examples to
confirm, anonymization/transfer rules, customer validation checklist.

Phase 6: docs/acceptance/ — six-module coverage, reconciliation & finance, Arabic &
security, business-rule equivalence, UAT checklist. Full suite with integration:
see TEST_LOG_2026-11-12.txt (this release).

Status vs the seven gates: (1) code implementation — advanced, six-module pipeline
defined with two honestly blocked modules; (2) technical tests — passing incl. real
PostgreSQL E2E; (3) live IBM i integration — UNVERIFIED; (4) business equivalence —
UNVERIFIED; (5) security approval — not granted; (6) customer acceptance — not
started (pack ready to send); (7) authorized production deployment — not complete.

## Addendum 6 — Final POC Readiness (2026-11-12, third release)

Formats corrected (docs/EXPORT_FORMATS.md): save files are UNSUPPORTED for direct
import (restore-then-extract route documented); CPYTOIMPF delimited is fully
supported (real CSV parser: quotes, embedded delimiters/newlines, group separators,
accounting negatives, null markers, validated dates); CPYTOIMPF fixed-TEXT is a
distinct decoder (EBCDIC/ASCII text numerics) — format confusion between text and
native binary is refused by the registered layout's format tag.

Approvals secured: approve-by-name is gone. Approvals are created only through the
authenticated API by a holder of migration.approve (budget/admin), bound to the user
id + role, with demo/customer mode separation (a demo approval cannot authorize a
customer batch), separation of duties vs the batch importer, an append-only event
history, auditable revocation, and advisory-lock concurrency between approval and
execution. Verified live: operator approve → 403; customer mode without evidence →
400; revoke → transform 422; re-approve → 200.

Large files: streaming importer (bounded memory, chunked transactions, durable
checkpoints, crash/resume proven at 1,200 records with the checkpoint holding
exactly the committed chunks), streamed uploads to 0600 temp storage with mid-stream
size caps and hash-on-write, delete-after-import retention. Benchmark (real, salted,
docs/BENCHMARK.md): 5 MB / 90,394 records at 4,289 rec/s; 25 MB / 451,972 records at
2,737 rec/s. The runs also exposed and fixed a staging-design defect: generated
staging tables carried legacy PRIMARY KEYs that aborted chunks on cross-batch keys;
staging is an evidence store keyed by (batch, offset) — generator fixed, schema
regenerated. Known scaling limit documented in BENCHMARK.md (key-set checkpointing).

Deployment: scripts/smoke-test.sh covers the 12 required verifications and is READY
BUT UNEXECUTED — no Docker exists in the development sandbox, and this report does
not claim otherwise. Full suite: 47/47 passing with integration enabled.

## Release-gate classification (Directive §10) — kept separate, as required
- Engineering implementation complete: SUBSTANTIALLY (formats, approvals, streaming, Migration Center; Budget/Estimates transforms remain evidence-blocked B-01/B-13)
- PostgreSQL integration verified: YES (47/47 incl. real-PG E2E, synthetic fixtures)
- Docker deployment verified: NO — smoke script ready, unexecuted (no Docker in sandbox)
- Migration engine verified with synthetic data: YES
- Migration engine verified with actual GAEB data: NO — no extracts received
- Legacy business equivalence verified: NO — reference results not supplied (B-03/B-04/B-08)
- Security approved: NO — controls implemented and tested; no customer security review
- Customer UAT approved: NO — not started (B-12)
- Production deployment authorized: NO

## Addendum 7 — Phase 4 (2026-11-12, branch phase-4-readiness)
Baseline a756241 reproduced exactly (47/47) before any change. Delivered:
customer pack x7 in docs/customer/ (inventory template generated from the
reconciled register: 1,095 field rows, unknowns marked REQUIRES CUSTOMER
CONFIRMATION; count template for all 125 PFs); controlled intake pipeline
(mig.intake_datasets/events, stage machine, evidence-mandatory transitions,
API + Migration Center panel); executable reconciliation endpoint implementing
the Workstream D metric definitions (count equation + totals asserted in E2E);
6 adversarial importer tests (empty extract, packed precision extremes,
conflicting duplicates preserved as evidence, IBM425 quarantine, delimited
null-never-zero, impossible dates); identity-forgery approval test (caught and
fixed a real defect: approver display name now resolved from the user record);
security pack (STRIDE threat model, self-assessment, RBAC matrix generated
from auth.ts, remediation register); validation pack (equivalence matrix,
reconciliation methodology, business-rule + exception registers); UAT package
(24 cases); performance report; deployment/rollback/operations runbooks;
PostgreSQL restart-recovery executed for real (PASS, evidence/phase4/recovery).
Suite: 53/53, 0 skipped, real PostgreSQL 16.4. Docker gate stays NOT VERIFIED
(no Docker in sandbox) — deployment-verification workflow written for a
Docker-capable runner. Gates unchanged otherwise: real data BLOCKED on GAEB,
equivalence/UAT/security-approval/production NOT STARTED.

## Addendum 8 — Phase 5 (2026-11-12, branch phase-5-certification)
Baseline 53/53 reproduced on phase-4-readiness (969fcd9) before changes; PR #2
depends on PR #1 (stacked). Headline: the O(n^2) checkpoint bottleneck is
ELIMINATED — root cause was mig.job_state.loaded_keys re-serialized per chunk;
fix = mig.loaded_keys incremental table + O(1) checkpoint (offset + key count)
+ advisory-locked persistChunk with in-transaction cross-chunk duplicate
quarantine and accepted-only exact totals. Benchmarks (same methodology):
18k@5,136 / 108k@5,380 / 506k@4,818 / 1,012,418@4,940 rec/s, RSS flat (vs
2,737 rec/s and growing RSS at ~450k before). An environment kill mid-benchmark
left exactly 35 committed chunks — durability confirmed by the accident.
Also: import job orchestration (009: lifecycle, lease claims, duplicate-active
unique index, creator/admin-only cancel — all E2E-tested); reconciliation
REPORT (JSON + text, provenance, transform hash + approval refs, three outcomes
kept separate); Arabic fidelity suite (5 tests) + report; metrics endpoint +
Operations dashboard strip; logical backup/restore of the 17-table evidence
chain executed PASS against two databases (fingerprints match); synthetic
pilot rehearsal PASS (all runbook steps via the real API); UAT cases 24 -> 30;
Docker certification + CI activation remain blocked on the same facts (no
Docker locally; token scopes gist/read:org/repo, no workflow) and are
documented as such in docs/release/PHASE5_*. Suite: 58/58, 0 skipped.
Gate changes: Scalability improvement VERIFIED; Backup/restore VERIFIED at the
logical+restart level (physical pg_dump cycle NOT verified — no pg_dump binary
in the sandbox distribution; all other gates unchanged.

## Addendum 9 — Phase 6 (2026-11-12, branch phase-6-customer-acceptance)
Baseline 58/58 reproduced on phase-5-certification (6c16204). Headline: the
backup gap is CLOSED at both levels — PostgreSQL 16.15 client tools installed
from Ubuntu 24.04 repos; pg_dump custom-format backup restored into a clean DB
with all 18 evidence tables fingerprint-matching AND application-level
reconciliation re-verified on the restored DB; pg_basebackup physical backup
(828 MB, 3m50s) booted as a standalone cluster with all 18 tables / 2,480 rows
fingerprint-matching. PITR and multi-host DR remain NOT VERIFIED (declared).
CI: activation patch generated (evidence/phase6/ci-activation.patch); API
checks show Actions enabled but main NOT branch-protected; token scope still
blocks the push. Docker still unavailable locally — gate unchanged, honestly.
Performance regression check: 506,209 records @ 5,261 rec/s (Phase 5: 4,818)
— no regression. npm audit unreachable from the sandbox (registry policy 403)
— recorded, not spun. Delivered: pilot environment package (requirements,
deployment runbook, checklist), real-data pilot report (BLOCKED, accurate),
business equivalence results with the 7 decisions owed, Phase 6 security
assessment + evidence index + residual risk register (RR-01..06), UAT
execution pack + 30-case results sheet + sign-off, operations acceptance pack,
6-document customer acceptance dossier (acceptance form UNSIGNED), production
readiness review. Suite at close: 58/58, 0 skipped.

## Addendum 10 — Phase 7 (2026-11-12, branch phase-7-pilot-activation)
Baseline 58/58 reproduced on b7f0686; close 65/65 (added preflight 3 +
security-negative 4). NEW VERIFIED GATE: point-in-time recovery — dedicated
drill cluster with WAL archiving, base backup, target-time restore:
transaction A present, transaction B absent, promoted in 27.4s
(tools/pitr-drill.mjs). Also: login throttling implemented (P7-F1 remediated,
429 after 10 failures/10min per ip+user) + correlation IDs; streaming
preflight intake validator (checksum REJECT, truncation/duplicate/Arabic
findings); SBOM 98 components, all permissive licenses, lockfile hashed;
benchmark ladder re-run incl. first 2M point: 108k@5,604 / 506k@5,416 /
1.01M@4,996 / 2.02M@4,533 rec/s, RSS bounded — no regression; health-check
tool verified in both directions (exit 0 clean / exit 1 naming FAILED jobs);
logical + physical backup re-executed PASS (one physical comparison was
invalidated by concurrent suite mutation, documented and re-run clean);
business decision register corrected to 8 decisions BD-01..08 (the "seven"
bundled CHKDIG+CHK5DAYS); RTM with 22 requirements; 16-item pilot package;
UX review recorded one known gap (no live import progress in UI — Phase 8).
Unchanged externals: CI BLOCKED (token scope), Docker NOT VERIFIED (no host),
npm audit registry-blocked, real data BLOCKED, UAT/security approval external.
Environment note: the VM replacement wiped the apt-installed PG client tools;
reinstalled from the local apt cache via dpkg.

## Addendum 11 — Phase 8 (2026-11-12, branch phase-8-pilot-execution)
65/65 baseline reproduced and held at close. CI/CD AUDIT executed with fresh
API evidence and the activation attempted three ways: HTTPS push REJECTED
with GitHub's explicit workflow-scope message for the OAuth (gho_) token;
Contents API 404 (masked refusal); SSH transports reset by the sandbox egress
proxy. No alternate credential exists. Owner resolution = 3 documented routes
(~2 min). Docker therefore still NOT VERIFIED — the blocker is the same
credential, runners were never the issue (public repo, Actions enabled, 0
runs ever). Delivered: security headers on all responses (verified live);
live migration monitoring — GET /batches/:id/progress (counts, checkpoint,
keys, run-ledger throughput, ETA labeled estimate, percent only when the
source total is knowable) + Migration Center live panel (2s polling, EN/AR,
aria-live); an endpoint crash during development (batch_runs has ran_at, not
started_at/finished_at) was caught by the E2E, fixed, and the handler
hardened. Preflight validated at scale: 29MB/500k records in 0.19s. Perf
regression: 506k @ 5,336 rec/s (P7: 5,416 — noise). Logical restore PASS
re-executed. SBOM unchanged (no dependency changes).

## Addendum 12 — Enterprise Experience Transformation (Concept D), 2026-11-13

Owner approved Concept D (synthesis of his reference boards) and the
production frontend was rebuilt on branch `ux-redesign`: navy-rail shell,
Portfolio Overview + Geographic Intelligence dashboards bound to live
APIs, all module workspaces redesigned, Migration Center re-skinned with
function preserved (plus approval create/revoke and import jobs surfaced
in the UI for the first time). One additive backend endpoint:
GET /api/overview (counts/queues for all roles; money only with
reports.finance), covered inside the existing integration E2E — suite
65/65 pass, 0 skipped, with TEST_DATABASE_URL set. Two defects caught by
live verification and fixed (overview session-object bug; approvals-table
crash on fields the list endpoint does not return — StatusChip hardened,
ErrorBoundary added). Design-system deviations and residuals R-UX-1…8 are
declared in docs/ux-redesign/IMPLEMENTATION_NOTES.md; acceptance scoring
in docs/ux-redesign/ACCEPTANCE_CRITERIA.md. No gate changed: CI/Docker
still BLOCKED/NOT VERIFIED on the same owner credential action; business
equivalence, UAT and production authorization unchanged.

## Addendum 13 — Enterprise UI Quality Certification (2026-11-13)

Executed against the directive of 2026-11-13 01:03 CT. Screen-by-screen
audit (88 captures, EN/AR × 4 viewports) produced 15 findings, all
corrected and re-verified: responsive shell, OCHA COD-AB choropleth
(CC BY-IGO) replacing the schematic geo view, certificate/estimate
detail drawers on two additive endpoints, admin user directory,
approvals mode/status contract fix, WCAG AA contrast corrections
(axe: zero critical/serious on scanned views), an exact-decimal
display defect in the money formatter caught by the new test suite,
and Arabic label completion enforced by dictionary-parity tests.
Frontend testing now exists: Vitest 27/27, browser E2E 25/25, backend
suite unchanged at 65/65. Entry JS reduced 1,306 KB → 208 KB. Full
evidence: docs/ui-certification/ (9 documents, 176 matrix screenshots,
verification captures). Gates 1–14 assessed in VISUAL_ACCEPTANCE_REPORT.md;
recommendation: accept with tracked residuals. CI/Docker remain blocked
on the owner's GitHub workflow-scope grant — unchanged.

## Addendum 14 — Phase 9: UI Release Hardening & Scale Validation (2026-11-13)

Baseline verified before changes (HEAD 0c6c8a1; 65/27/25 reproduced
exactly). All six certification residuals closed: drawer focus
management with keyboard tests; automated visual regression
(puppeteer + pixelmatch, 31 baselines, 0.00% repeat diff);
server-side School Map pagination/sort/filter/search with migrations
010 (btree) + 011 (guarded pg_trgm), validated at 10k/100k/1M
synthetic records (search at 1M: 1,299 ms -> 277 ms p50); Arabic
localization completed (249-key parity); heading hierarchy and
landmarks corrected — axe zero violations of any severity on all 11
views. Disclosure: the certification's F-01 mobile fix was incomplete
(rail nav inflated the shell grid to ~1,807 px at phone widths);
fixed and guarded by a permanent E2E no-overflow assertion. Suites on
the final build: backend 65/65, frontend 32/32, browser E2E 40/40,
visual 31/31. Evidence: docs/phase9-ui-release/ (13 documents,
executive gallery, scale evidence). CI/Docker still BLOCKED on the
owner's GitHub workflow scope; screen-reader validation NOT VERIFIED
(external gate). Recommendation: accept the UI release with those
two external conditions. Production readiness is not claimed.
