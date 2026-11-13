# Phase 13 — Audit & Evidence Export (Workstream G)

## Export
`GET /api/pilots/:id/audit-export` (auditor permission:
`migration.approve` — budget/admin) returns one JSON package:
`{ generatedAt, pilot, conditions, evidence[], datasets[],
audit[] }` — every evidence record with its full lifecycle
fields and stable `EV-<id>` reference, every dataset binding,
and the complete append-only audit trail for the pilot:
creation, evidence create/submit/document/verify (including
**denied** verification attempts with reasons), revocations,
dataset registration/authorization, activation, suspension,
reactivation, **every import authorization decision (allowed
and refused, with reasons)**, transforms, and closure.

## Properties
- Stable identifiers (pilot id, `EV-<id>`, batch ids, audit row
  ids) and ISO timestamps throughout — machine-readable as-is.
- The audit log is append-only in the application; the export is
  a read, never a rewrite.
- The export contains **metadata only**: document references and
  hashes, never document contents; no credentials; no customer
  record data (migration data lives in batches, referenced by id).
- Exercised live in the rehearsal (R-26): 12 evidence records and
  the refusal decisions present in the exported package.
