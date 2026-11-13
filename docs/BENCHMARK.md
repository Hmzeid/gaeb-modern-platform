# Streaming Import Benchmark — measured, not estimated

Tool: `platform/tools/benchmark.mjs`. Data: synthetic native-binary PBLBULDG-format
extracts (58-byte records, IBM420 Arabic names), generated fresh per run (salted, so
no checkpoint resume can fake the numbers — the `loaded` count is read back from
mig.batches after each run). Machine: the development sandbox (shared 1.5 vCPU,
PostgreSQL 16.4 on the same host) — production hardware will differ; treat rates as
a floor, not a promise.

| File | Records | Loaded | Chunks (1,000) | Time | Rate | Process RSS before → after |
|---|---|---|---|---|---|---|
| 5 MB | 90,394 | 90,394 | 91 | 21.1 s | 4,289 rec/s | 98 MB → 193 MB |
| 25 MB | 451,972 | 451,972 | 452 | 165.1 s | 2,737 rec/s | 154 MB → 216 MB |

## Reading the numbers honestly
- The importer itself is streaming and bounded (256 KB read buffer, one chunk of
  records in memory). The RSS growth and the rate decline at scale come from the
  duplicate-detection key set: every loaded key is retained and the full set is
  checkpointed to mig.job_state per chunk, which is O(n) per chunk and O(n²) overall
  in checkpoint bytes.
- Consequence: at GAEB's expected file sizes (largest known reference file ~35k
  rows) this is a non-issue. For a hypothetical multi-million-record file, the fix
  is known and scoped: checkpoint only a digest + rely on the staging unique index
  for cross-chunk duplicates, keeping intra-chunk keys in memory. Not built —
  recorded here as the identified scaling limit rather than discovered later.
- The benchmark also caught a real defect on its first runs: generated staging
  tables carried legacy PRIMARY KEY constraints, so a second batch containing an
  already-seen legacy key aborted whole chunks. Staging is an evidence store —
  the generator no longer emits legacy PKs (identity is _batch_id + _source_offset),
  and the fix is covered by these very runs completing.

## Crash/resume evidence
The integration suite kills a 1,200-record stream after chunk 1 (500 records) and
resumes: checkpoint holds exactly 500, the resume loads the remaining 700 (1
duplicate quarantined), totals reconcile to the staged SUM exactly.

## Phase 5 addendum — after the scalable-checkpoint fix (2026-11-12)
Same machine, same methodology (salted files, `loaded` read back from
mig.batches), streaming path now on mig.loaded_keys + O(1) checkpoints:
| Records | Seconds | rec/s | RSS before → after |
|---|---|---|---|
| 18,078 | 3.52 | 5,136 | 83 → 142 MB |
| 108,473 | 20.16 | 5,380 | 162 → 218 MB |
| 506,209 | 105.06 | 4,818 | 151 → 228 MB |
| 1,012,418 | 204.93 | 4,940 | 300 → 280 MB |
Throughput is flat across a 56x size range and RSS no longer grows with the
record count (the 1M run ended LOWER than it started). Comparable-point gain
at ~500k records: 2,737 → 4,818 rec/s (1.76x) with the decline eliminated.
An interrupted 506k run during measurement committed exactly 35,000 records
(35 chunks) before the environment died — the checkpoint state in the database
matched, confirming incremental durability. Raw log: evidence/phase5/benchmark.log.
