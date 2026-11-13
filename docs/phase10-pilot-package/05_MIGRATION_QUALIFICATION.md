# 05 — Real-Data Migration Qualification

**Standing statement: no real GAEB data has been migrated.** This
document defines how qualification will be executed and judged once
GAEB authorizes extracts. Nothing here is a result.

## Secure extract intake process
1. **Authorization first.** A written GAEB authorization naming the
   files, the transfer window, and the data owner. No authorization,
   no transfer — the pilot environment accepts nothing informally.
2. **Production on the IBM i side.** GAEB's IBM i team restores /
   exports from a scratch library into one of the supported offline
   formats (native-binary flat file with a registered layout,
   fixed-text, or delimited). IBM i save files are not ingested
   directly — this is a documented platform boundary, agreed up
   front, not discovered mid-pilot.
3. **Transfer & custody.** Encrypted transfer to the pilot
   environment's intake area; SHA-256 recorded at receipt;
   chain-of-custody entry in the intake register; the platform's
   10-stage intake state machine tracks every file from receipt to
   disposition. The platform never connects to the AS/400 and never
   writes to it.
4. **Preflight before import.** The preflight validator reports
   READY / REVIEW / REJECT per file (layout match, encoding probes,
   record geometry) — a REJECT is never forced through.

## Validation dimensions (each evidenced per batch)
- **Encoding & Arabic fidelity:** per-file/per-field CCSID
  discovery; decoded values compared against legacy listings on a
  sample; originals preserved; IBM425-content files are flagged,
  not guessed (B-05).
- **Schema mapping:** imports are gated by the layout hash and by
  human mapping approvals bound to the transform version; demo
  approvals never authorize customer data.
- **Data quality:** duplicates quarantined with raw-hex evidence
  (semantics per BD-07); malformed records quarantined, never
  silently dropped; every record is accounted for.
- **Lineage:** batch IDs derive from the file hash; run ledgers are
  append-only; re-import of the same file is a no-op (idempotent).
- **Reconciliation:** per batch, source = loaded + quarantined
  (exact equation), plus field control totals; the reconciliation
  report separates *technical outcome* from *business equivalence*
  and *customer acceptance* — three different columns, on purpose.
- **Exception handling:** rejects are reviewable and resubmittable
  through an audited path after correction at the source.

## Proposed acceptance thresholds (FOR GAEB APPROVAL — not contractual)
| Dimension | Proposed threshold |
|---|---|
| Record accounting | 100% — every source record loaded or quarantined with evidence |
| Reconciliation equation | Holds exactly on every batch (no tolerance) |
| Field control totals (money) | Exact match to the halala/piastre |
| Arabic fidelity sample | 100% of sampled fields decode to the listing value; any miss stops the batch for review |
| Duplicate handling | 100% per the BD-07 rule once decided |
| Transform gating | Zero transforms run without a customer-mode approval + evidence reference |

These become requirements only when GAEB signs them into the pilot
agreement. Until then they are the engineering team's proposal.

## Equivalence — the honest boundary
Technical reconciliation proves the data arrived intact. Business
equivalence (the numbers *mean* the same as the legacy system's)
requires the BD-01…BD-08 decisions and sampled recomputation
against legacy listings (§06 validation column). Both are required
before anyone says "migrated."
