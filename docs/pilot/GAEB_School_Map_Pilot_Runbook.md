# GAEB School Map Pilot Runbook

Scope: the FIRST real-data pilot — PBLBULDG + School Map reference files only.
Prerequisite: the Data Request Pack (docs/customer/) delivered by GAEB with
manifest, checksums, counts, and CCSID confirmations. Until then this runbook
is exercised only as a synthetic rehearsal (platform/tools/pilot-rehearsal.mjs)
and no step here is claimed against real data.

## Procedure (each step maps to an intake stage + an evidence register row)
1. **Receive** — delivery lands via the agreed encrypted channel; manifest
   checked for completeness (PE-01). Intake dataset registered (stage: received).
2. **Verify manifest + checksum** — SHA-256 of every file recomputed and
   compared (PE-02). Mismatch = stop, re-request; never repair. → registered.
3. **Register lineage** — batch identity derives from the file hash; source
   file, layout, and importer are provenance on the batch record (PE-03).
4. **Verify encoding** — the layout (with per-field CCSIDs) is registered by an
   admin; the import refuses unregistered or hash-mismatched layouts (PE-04).
   → verified.
5. **Profile** — record count and a decode preview compared against the
   manifest counts (PE-05). → profiled.
6. **Map + Approve** — mapping review signed by GAEB; an authorized approver
   (never the operator, never the importer) records CUSTOMER-mode approvals
   bound to the exact transform definition hash (PE-06). → mapped → approved.
   The intake 'approved' stage records governance progress only; the transform
   gate independently re-checks the identity-bound approvals at execution.
7. **Import** — streaming import; watch progress + quarantine in the Migration
   Center (PE-07). Interruptions resume from the checkpoint; nothing is re-run
   from zero and nothing double-counts. → imported.
8. **Reconcile** — reconciliation report generated (JSON + text): source =
   loaded + quarantined; totals vs the GAEB manifest figures (PE-08). Any
   failed equation stops the pilot here. → reconciled.
9. **Exception report** — every quarantined record itemized with offset,
   reason, and raw bytes; GAEB decides correction vs source-fix (PE-09).
10. **Business review** — GAEB's School Map owner spot-checks buildings,
    including Arabic names against the legacy screens. → reviewed.
11. **Acceptance decision** — recorded in the intake pipeline and the UAT
    sign-off; a completed import alone is NOT acceptance (PE-10). → accepted.

## Abort conditions
Checksum mismatch; layout hash mismatch; failed reconciliation equation;
approval revoked mid-pilot; any request to load under demo-mode approvals.
Each abort is recorded in the issues register with the step and evidence.
