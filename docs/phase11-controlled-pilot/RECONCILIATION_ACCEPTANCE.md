# Phase 11 — Reconciliation & Acceptance Evidence (Workstream G)

## The accounting invariant (platform ledger semantics)
For every batch:
```
source_records = loaded_records + quarantined_records
```
where `source_records` counts every record unit in the extract
including a truncated trailing fragment (which is quarantined,
never silently dropped), `quarantined_records` includes duplicate
occurrences as an explicitly reported subset
(`duplicateOccurrences`), and no record is ever counted twice.
Parsed-but-undecodable and duplicate dispositions are itemized by
reason in the report (`quarantineReasons`). Financial control
totals are carried as exact DECIMAL strings end to end — the
rehearsal batch's VGCD control totals (source 30,617,289 vs loaded
22,962,968) differ by exactly the value carried on the quarantined
parseable records; there is no floating-point anywhere in the chain.

## Customer-readable package per batch
The reconciliation report (JSON + text renderings from
`GET /api/migration/batches/:id/reconciliation[/report]`) carries:
batch ID, member, data class, source SHA-256, layout, importer,
source/parsed/loaded/quarantined counts, duplicate occurrences,
quarantine reasons, field control totals (source vs loaded),
transform outcome — and the three separate verdicts:
**technical outcome** (PASSED/FAILED by the equation),
**business equivalence** (PENDING until BD evidence + sampling),
**customer acceptance** (PENDING until GAEB records it).

## Rehearsal evidence (synthetic, executed)
Fixture batch `mig-85d145a2be972fe6`: source 6 = loaded 3 +
quarantined 3 (1 duplicate key, 1 bad zoned digit, 1 truncated
tail). Streamed batch: 3,000 = 3,000 + 0 across 7 chunks.
Independent recount by the rehearsal script (which constructs the
fixtures and therefore knows the truth) matched the platform's
report on every figure. Full results:
`evidence/rehearsal-results.json`.

## Proposed acceptance thresholds (non-contractual until GAEB approves)
Record accounting 100% · equation holds exactly on every batch ·
money control totals exact · Arabic fidelity sample 100% ·
duplicates per the BD-07 rule · zero transforms without a
customer-mode approval + evidence reference. (Carried from Phase 10
§05 unchanged — GAEB approval converts them into requirements.)

## Reconciliation sign-off (per pilot batch)
Batch: __________  Source SHA-256: __________
Counts verified (source = loaded + quarantined): ☐
Control totals verified: ☐   Exceptions reviewed: ☐
GAEB data owner: __________  Date: ______
Migration engineer: __________  Date: ______
