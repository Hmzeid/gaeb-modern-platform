# GAEB Reconciliation Methodology

Implemented in `platform/src/migration/reconcile.ts`, exposed at
`GET /api/migration/batches/:id/reconciliation`.

## Metric definitions (binding for all reports)
- **source_records** — record positions in the source extract, including a
  quarantined incomplete trailing fragment. Counted once per source file from
  the run ledger; a retry never adds to it.
- **parsed_records** — records that decoded successfully = loaded + duplicates.
- **loaded_records** — rows physically present in staging for the batch.
- **quarantined_records** — rows in `mig.rejects` for the batch, all causes,
  each with offset, reason, and raw bytes.
- **duplicate_occurrences** — quarantined rows caused by a repeated legacy key.
  They remain full source evidence. The platform never deduplicates source
  evidence; business-level dedup would be a separate, approved transformation.
- **control_total(field)** — exact decimal sum over LOADED records.
- **source_total(field)** — exact decimal sum over all PARSED records.
- **difference** — source_total − control_total; must equal the sum carried by
  quarantined parseable records (duplicates), or the batch fails review.

## Acceptance equations (must all hold)
1. source_records = loaded_records + quarantined_records
2. source_total(field) − control_total(field) = quarantined parseable value(field)
3. GAEB live count = source_records; GAEB live SUM = source_total(field)
   (equations against the CUSTOMER's figures, from the delivery manifest)
4. After transformation: operational row count for the batch = loaded_records −
   transform-quarantined (join failures), each transform quarantine itemized.

## Procedure per batch
Import → endpoint check (equations 1–2, automated in tests) → compare with the
manifest (equation 3, human review at intake stage 'reconciled') → approve
transform → transform → equation 4 → intake stage 'reviewed' → GAEB 'accepted'.
Any failed equation stops the pipeline at that stage; partial acceptance of a
batch is not possible.
