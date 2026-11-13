# Phase 12 — Synthetic Pilot Dry Run Results

Executed 2026-11-13 with `platform/tools/phase11-rehearsal.mjs`
(extended for this phase) against a disposable database and the
real APIs, in the same operational sequence the GAEB pilot will
follow. Machine evidence: `evidence-dry-run.json`.

## Result: 28/28 checks passed
- **Migration core (Phase 11 sequence, re-executed):** preview,
  import, idempotent re-import, reconciliation vs independent
  recount, approval gates (no-approval / wrong-role /
  self-approval / revoked), 3,000-record streaming with
  checkpoints, job state machine, format + NUL negatives,
  standalone preflight, backup/restore fingerprint (18/18 tables).
- **Pilot activation sequence (new, R-15…R-19):**
  customer-class import refused with no active pilot (422) →
  pilot created → 10 attestations recorded with evidence
  references → customer-mode mapping approval recorded →
  both automated conditions verified live → **activation 200** →
  customer-class import proceeds (200, synthetic bytes) → pilot
  closed → customer-class import refused again (422) → a second,
  incomplete pilot's activation refused (422) with the missing
  conditions listed.

## Harness findings (fixed in the harness, platform unchanged)
1. The rehearsal's HTTP helpers died after the backup step: a
   long synchronous subprocess left a keep-alive socket idle past
   the server's timeout, and the next fetch reused the dead
   socket. Fixed with retry-once on a fresh connection; the API's
   stderr is now forwarded so a real server failure can never be
   mistaken for a network artifact again.
2. Earlier in the phase, the integration suite exposed that its
   own setup applied only migrations 001–009; it now applies
   001–012, and the pilot read routes were hardened so a database
   error returns 500 instead of ever terminating the process.

## Still NOT EXECUTED (unchanged, by design)
Storage-exhaustion and database-interruption fault injection
require a dedicated disposable host (quota-limited volume /
killable database). The executable procedures are in the
Phase 11 rehearsal document (§ Not executed); restart-recovery
remains verified by `tools/restart-recovery.mjs`.
