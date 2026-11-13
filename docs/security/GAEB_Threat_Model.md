# GAEB Threat Model (STRIDE) — migration platform

Scope: standalone platform (API, frontend, PostgreSQL), the offline extract
pipeline, and the customer-data intake path. Method: STRIDE per component.
This is an internal engineering threat model — **not** an independent security
audit (none has occurred; gate status: NOT GRANTED, blocker B-11).

## Spoofing
- T-S1: Approver identity forgery → approvals take identity ONLY from the
  authenticated session; request-body identity fields are ignored (tested:
  forged-identity integration test). Residual: session theft — mitigated by
  opaque revocable session tokens, SHA-256 at rest, TTL.
- T-S2: Fake "customer approval" artifacts → customer-mode approvals require an
  evidence reference and are hash-bound to the exact transform definition; the
  append-only event log records actor id + role for every grant/revoke.

## Tampering
- T-T1: Post-approval mapping edit → definition hash mismatch makes the approval
  void at transform time (tested). T-T2: Batch-total rewriting on retry →
  append-only run ledger + cumulative totals in one transaction (tested).
  T-T3: Source-evidence alteration → staging rows carry raw bytes + offsets;
  rejects are preserved, never deleted by resubmission. T-T4: Upload tampering →
  SHA-256 computed while streaming; batch id derives from the file hash.

## Repudiation
- T-R1: "Who approved/ran this?" → audit log (actor, action, entity) + approval
  events + intake events; admin-only audit endpoint. Residual: log integrity
  rests on database access control — see remediation R-03 (WORM/export).

## Information disclosure
- T-I1: Report data leaking across roles → report-level authorization enforced
  (finance CSV: technical 403 / budget 200, tested). T-I2: Customer records in
  the wrong repo/artifact → transfer protocol forbids record content in reports;
  repository contains synthetic fixtures only. T-I3: Upload temp files → 0600,
  size-capped mid-stream, deleted after import unless explicitly retained.

## Denial of service
- T-D1: Oversized/poisoned uploads → streamed with hard byte cap; per-record
  quarantine isolates bad records without aborting the batch. T-D2: Checkpoint
  blowup on very large files → documented O(n²) checkpoint cost with a scoped
  fix (BENCHMARK.md); bounded at GAEB's known file sizes.

## Elevation of privilege
- T-E1: Operator self-approval → role separation + per-batch importer≠approver
  check (tested: technical approve → 403; SoD covered by gate tests).
  T-E2: Demo approvals authorizing customer data → mode separation enforced at
  the gate (tested). T-E3: Revoked approval replay → status checked at run time;
  revocation drill tested (422 naming the revocation).
