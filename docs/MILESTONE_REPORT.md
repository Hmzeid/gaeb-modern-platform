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
