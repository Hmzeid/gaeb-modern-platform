# GAEB Operations Manual (operator view)

## Daily operation of a migration batch
1. Receive the extract + manifest; verify SHA-256; register the dataset in the
   intake pipeline (Migration Center → Intake).
2. Advance stages with evidence at each step: registered → verified (layout
   hash matches the registry) → profiled (counts vs manifest) → mapped
   (mapping review signed) → approved (customer-mode approvals recorded by the
   approver) → imported → reconciled (equations checked against the manifest)
   → reviewed → accepted (GAEB sign-off).
3. Quarantine is a work queue, not a bin: each entry carries offset + reason +
   raw bytes. Correct through resubmission (the original stays linked) or
   escalate to GAEB when the source itself is wrong.

## Roles at a glance
Operator (technical) imports and runs transforms; approver (budget) approves
mappings; admin manages users, layouts, and reads the audit trail. Full matrix:
docs/security/GAEB_RBAC_Matrix.md.

## Incidents
- Import interruption: just re-run — checkpoints resume; never hand-edit
  mig.job_state.
- Checksum mismatch on a delivery: stop; re-request the delivery (Transfer
  Protocol §2). Never repair an extract by hand.
- Suspected data exposure: notify GAEB's named contact within one business day
  (Transfer Protocol §6).

## Health
API `/health`; Migration Center shows batches, quarantine, approvals, intake
stages, reconciliation, and (admin) the audit trail.
