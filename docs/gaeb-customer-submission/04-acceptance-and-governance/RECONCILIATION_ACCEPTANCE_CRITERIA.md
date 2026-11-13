# Reconciliation Acceptance Criteria (for GAEB adoption)

Per batch, the reconciliation package is acceptable when **all**
of the following hold — proposed by Veebase; binding when GAEB
adopts them in the charter:

1. **Accounting:** source records = parsed = loaded +
   quarantined, exactly; duplicates itemized with dispositions
   under the BD-07 rule.
2. **Money:** every financial control total agrees exactly
   (decimal, no tolerance) between source totals and staged
   totals over the accepted subset.
3. **Arabic fidelity:** the agreed sample (drawn jointly,
   min. 200 records or 5% of the batch) matches the legacy
   originals character-for-character in the preserved fields.
4. **Exceptions:** every quarantined record carries a reason
   code and its raw bytes; every exception is either corrected
   and re-run under change control, or closed by a written
   GAEB decision.
5. **Lineage:** every loaded record traces to its source file,
   offset, and batch; the batch traces to its authorized
   dataset and file hash.
6. **Sign-off:** the package is signed by GAEB's Data Owner;
   unsigned packages do not count toward acceptance.
