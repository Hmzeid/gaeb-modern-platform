# 01 — Solution Architecture

## System shape
A standalone, self-hosted web platform with no dependency on any
external SaaS or on the tooling that built it:

- **Frontend** — React single-page application (EN/AR, full RTL),
  served as static assets; executive dashboard, geographic
  intelligence, six operational modules, Migration Center, reports,
  administration.
- **API** — Node.js/TypeScript service (Express), REST, session
  authentication with role-based authorization and separation of
  duties, exact-decimal money handling, full audit logging.
- **Database** — PostgreSQL 16: operational schema (`app`),
  staging schema generated from the legacy DDS inventory
  (`school_map`, `budget`, …), migration control schema (`mig`).
- **Migration engine** — offline extract ingestion (the platform
  never connects to, and never writes to, the AS/400), layout-hash
  gated imports, resumable chunked loading, quarantine with raw
  evidence, approval-gated transforms, reconciliation reporting.

## Design principles (enforced in code, not just documented)
- Money is exact decimal end to end; certificate valuation is
  quantity × price with typed deductions; rounding never happens
  silently.
- Arabic data integrity is field-level: original bytes preserved,
  codepage decoding is table-driven and evidence-based, search
  normalization never overwrites stored originals.
- Every state change is audited (actor, action, entity, timestamp).
- Workflow machines cannot skip stages (tenders: 12 stages;
  certificates: draft → certified → billed → payment-authorized →
  paid, with the certifier barred from authorizing payment).
- The UI never presents placeholder data as real: dashboards read
  live aggregates; finance figures are withheld from roles without
  the finance permission at the API level.

## Repository map
`platform/` (backend, frontend, migrations 001–011, tools),
`docker-compose.yml` (db + api + frontend), `docs/` (phase evidence
from inception through Phase 10). Current release line: PRs #1–#8
stacked and open; Phase 10 is PR #9.
