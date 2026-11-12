# Customer POC Demonstration Package — witnessed migration rehearsal

**Distinction shown on screen throughout:** every record in this demonstration is
SYNTHETIC (generated fixtures, batch ids and demo approvals are labeled as such).
When GAEB extracts arrive, the identical steps run on customer data with
customer-mode approvals — no application code changes.

## Accounts and permissions (created before the session)
| Account | Role | Used for |
|---|---|---|
| demo-admin | admin | user setup only |
| demo-operator | technical | upload, preview, import, transform execution (migration.run) |
| demo-approver | budget | mapping approvals (migration.approve) — deliberately a different person from the operator |

## Script (expected results are exact for the standard fixture)
1. **Start:** `docker compose up -d` (or the prepared environment). Operator signs in.
2. **Inventory:** Migration Center shows 502 legacy objects with honest statuses.
3. **Upload + preview:** upload the synthetic PBLBULDG extract (58-byte records).
   Preview decodes 2 records: مدرسة النيل الابتدائية / مدرسة النصر الابتدائية, VGCD
   7654321 / 7654322. Two further records are visibly defective (duplicate key,
   corrupt zoned field) plus a 13-byte truncated tail.
4. **Import:** batch `mig-<hash>` — loaded 2, quarantined 3, each reject with offset
   and reason. Reconciliation panel: control total 15,308,643 = staged SUM;
   source total 22,962,964; delta = exactly the quarantined duplicate.
5. **Repeat import (idempotency proof):** run the same file again — "already
   recorded": totals, staged rows and rejects unchanged.
6. **Approval gate (security proof):** operator attempts the transform → refused
   (no approvals). Operator attempts to approve → **403** (separation of duties).
   Approver signs in, reviews the mapping and its definition hash, approves in
   **demo mode** with an evidence reference. Approval history shows who/when/hash.
7. **Transform:** operator runs it → 2 buildings inserted. Open **School Map**: the
   migrated buildings are listed with Arabic names intact.
8. **Error scenario:** revoke the approval (approver, with a reason) → transform
   refuses again, naming the revocation. Re-approve to continue.
9. **Reject correction:** open the quarantine list, correct the corrupt record's
   VGCD through the resubmit form → corrected row lands in staging under a
   resubmission batch; the original reject stays on record, linked.
10. **Audit trail:** audit log shows login, import, approval, revocation,
    transform, resubmission — each with user and timestamp.
11. **Reports:** budget user downloads the finance CSV; operator receives 403 —
    report-level authorization demonstrated live.
12. **Large-file proof (optional in session):** the streaming importer processes a
    25 MB / ~451k-record synthetic extract in chunks with durable checkpoints;
    killing it mid-run and restarting resumes at the last committed chunk
    (benchmark evidence: docs/BENCHMARK.md).

## Business validation checks for the witnesses
- Arabic names character-identical between preview, staging, and the module screen
- Every number in the reconciliation panel traceable to staged rows (SQL shown)
- No silent drops: file records = loaded + quarantined, always

## Sign-off checkpoints (during the session)
- [ ] GAEB witness confirms the demonstrated batch totals and quarantine handling
- [ ] GAEB witness confirms the approval separation (operator cannot self-approve)
- [ ] GAEB confirms the Data Request Pack items they will supply and the format (B/C/D)
- [ ] Date agreed for the first real School Map extract delivery
