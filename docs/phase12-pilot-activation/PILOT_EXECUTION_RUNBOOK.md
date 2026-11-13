# Phase 12 — Pilot Execution Runbook

The operational sequence for an authorized pilot, mapped to the
platform's actual controls (Administration → Pilot activation
panel, or the `/api/pilots` endpoints).

1. **Create the pilot** (administrator): name + environment in the
   Pilot activation panel. The registry opens with all 12
   conditions pending.
2. **Satisfy attestations** as the underlying GAEB documents are
   signed: charter, scope, BD-07/BD-08 sheet, extract
   authorization, environment approval, backup-drill report,
   received test alert, transfer mechanism, participants list,
   security prerequisites. Each attestation records the evidence
   reference, the administrator, and a timestamp in the audit log.
3. **Verify automated conditions**: customer-mode mapping
   approvals (recorded by GAEB's approver role with evidence
   references) and the environment preflight — both checked live
   by the server, not asserted by anyone.
4. **Activate**: the server re-verifies automated conditions at
   that instant and lists anything missing. Only then does the
   pilot become `active` — and only then will the platform accept
   a customer-class import.
5. **Execute intake** per the 15-step protocol: hash-verified
   transfer, preflight, tracked import job, live progress.
6. **Quarantine review**: rejected records reviewed with raw
   evidence; corrections return to the source.
7. **Reconcile**: per-batch package + GAEB sign-off
   (`docs/phase11-controlled-pilot/RECONCILIATION_ACCEPTANCE.md`).
8. **Customer validation + UAT** per the UAT kit.
9. **Closure**: administrator closes the pilot; customer-class
   imports are refused again from that moment. Closure is recorded
   in the audit log with the acceptance evidence references.
