# Phase 9 — Enterprise-Scale Test Report (Workstreams C + A3)

## Method
`platform/tools/phase9-scale.mjs` builds a scratch database
(`gaeb_scale`) from the production migrations, seeds the 27 real
governorate reference rows (from the certified boundary asset), and
generates a deterministic synthetic registry with
`generate_series` + md5-derived assignment: Cairo/Giza/Alexandria
weighted heavy, Arabic school names from a 10-stem pattern set,
unique legacy codes. It then starts the real API against that
database and measures endpoints over HTTP (30 samples each; 10 for
full-list endpoints). Query plans were captured with
`EXPLAIN (ANALYZE)` for the paged endpoint's SQL shapes.
Raw outputs: `evidence/scale-10k.json`, `scale-100k.json`,
`scale-1m.json`.

Environment: build sandbox, shared 1.5 vCPU, PostgreSQL 16.4
embedded, Node 24. These are laboratory figures on constrained
hardware — a floor, not a production capacity claim.

## Results — paged School Map endpoint (ms, HTTP end-to-end)

| Dataset | Page 1 (id) p50/p95 | Last page p50/p95 | Sort name p50 | Gov filter p50 | Search p50/p95 |
|---|---|---|---|---|---|
| 10,000 | 4.9 / 11.9 | 4.8 / 5.4 | 3.7 | 2.7 | 33 / 36 |
| 100,000 | 13.7 / 21.4 | 32.6 / 53.8 | 13.1 | 4.7 | 312 / 371 *(pre-trigram)* |
| 1,000,000 | 90.6 / 126.3 | 217 / 273 | 99.5 | 41.9 | **277 / 411** *(with trigram)* |

Search before migration 011 at 1M records: p50 **1,299 ms**
(sequential scan). After the guarded pg_trgm GIN indexes (EN name,
AR name, legacy code) and removing an expression wrapper that
blocked index use: p50 **277 ms**, plan = Bitmap Heap Scan over the
trigram indexes. The residual cost is dominated by the exact
`COUNT(*)` over the match set on this hardware.

## Query plans (1M records, excerpts in evidence files)
- Page 1 by id: Index Scan on the PK, 4.9 ms execution.
- Deep page (offset 999,975): Index Scan walking the PK —
  569 ms cold / ~250 ms warm end-to-end. OFFSET cost is linear in
  page depth; documented behavior, acceptable for a registry
  browser (users reach deep pages via search/filter, which resets
  depth). Keyset pagination is the known future remedy if deep
  paging becomes a primary workflow.
- Governorate filter: the (governorate_code, id) index serves the
  page; the exact filtered COUNT is the slow component on cold
  cache (bitmap heap scan over ~117k rows for Cairo). Warm API
  measurements: p50 41.9 ms.
- Unfiltered COUNT(*) over 1M: ~300 ms cold (parallel aggregate) —
  this is the floor under "page 1" latency on this hardware and
  the price of the directive's exact-total requirement.

## Other endpoints at 1M buildings / 20k tenders / 50k audit rows
| Endpoint | p50 | Note |
|---|---|---|
| `GET /api/overview` | 93.9 ms | Aggregates stay bounded; counts dominate |
| `GET /api/reports/buildings-by-governorate` | 388.6 ms | Full-registry GROUP BY; acceptable for a report, noted |
| `GET /api/buildings?limit=200` (legacy) | 4.1 ms | Unchanged, capped |
| `GET /api/audit` (LIMIT 200) | 4.3 ms | Stable at 50k rows |
| `GET /api/tenders` (all rows) | 64.4 ms / 1.9 MB | **Observation:** the tenders list returns every row. At GAEB's plausible tender volumes this is fine today; the buildings pattern should be applied when tender counts grow. Recorded, not changed — outside A3's scope. |

## Browser behavior at scale
The School Map now transfers one page (25 rows, ~7.9 KB) per
interaction regardless of registry size — vs 61 KB for the old
200-row cap and unbounded growth before it. Rendering cost per page
is constant. No whole-registry memory footprint exists in the
browser anymore.

## Verdict
**PASS** for the School Map at the required 10k/100k/1M scales with
the documented OFFSET and exact-count costs. The migration
throughput benchmarks from earlier phases were not used as evidence
here; all figures above are UI-path measurements.
