# GAEB Performance Report

## Environment (all measurements)
Sandbox VM: shared 1.5 vCPU, PostgreSQL 16.4 on the same host as the importer,
Node v24.22.1. These figures are a **floor**, not a sizing promise — a dedicated
host will differ. Methodology: `platform/tools/benchmark.mjs`, salted synthetic
PBLBULDG-format records (checkpoint resumes cannot fake throughput), `loaded`
read back from `mig.batches` after the run.

## Measured results (Phase 3 baseline, unchanged code path in Phase 4)
| Size | Records | Chunks | Elapsed | Throughput | RSS |
|---|---|---|---|---|---|
| 5 MB | 90,394 | 91 | 21.08 s | 4,289 rec/s | 98 → 193 MB |
| 25 MB | 451,972 | 452 | 165.14 s | 2,737 rec/s | 154 → 216 MB |

## Known scaling limit (measured, documented, not hidden)
Throughput decline and RSS growth come from checkpointing the full loaded-key
set per chunk (O(n²) checkpoint bytes). At GAEB's known file sizes (largest
reference file ≈ 35k rows) this is a non-issue. Scoped fix (not built): digest
checkpoint + database-side duplicate detection — see docs/BENCHMARK.md.

## Reliability results (Phase 4, executed)
- Interrupted streaming import resumes exactly at the checkpoint (1,200-record
  test: crash after chunk 1 → checkpoint 500 → resume completes; totals exact).
- PostgreSQL restart recovery: PASS (evidence/phase4/recovery/) — batches,
  totals, and quarantine identical across a real server restart.
- Invalid-record stress: adversarial suite — corrupt, truncated, mis-encoded,
  null, and conflicting records quarantine individually; the batch never aborts
  and never silently drops.

## Not measured (stated plainly)
- Concurrent imports against one database (advisory locks serialize transforms;
  concurrent import throughput is unmeasured).
- Sustained multi-hour imports; network-transfer throughput (customer-side).
- Frontend behaviour with >10k-row tables (pagination is a UAT observation item).
