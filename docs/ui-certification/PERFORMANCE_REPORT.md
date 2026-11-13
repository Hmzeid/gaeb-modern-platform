# Performance Report — UI Certification

Environment caveat first: measurements were taken in the build
sandbox (shared 1.5 vCPU, headless Chrome 157 shell, local
PostgreSQL). They establish orders of magnitude and regressions, not
production SLAs. API latency was measured server-local.

## Bundle budget

| Metric | Budget | Before | After |
|---|---|---|---|
| Entry JS (initial load) | ≤ 400 KB | 1,306 KB | **208 KB** |
| Lazy view chunks | ≤ 150 KB each | 98 KB (contained ECharts statically at entry) | 98 KB views + 1,135 KB ECharts chunk loaded on first chart mount only |
| Entry CSS | ≤ 40 KB | ~26 KB | ~27 KB |

Correction F-14: the shared Chart component statically imported
ECharts, defeating the route-level lazy loading. It now
dynamic-imports the library on first mount; all call sites are
unchanged. Views without charts never download it.

## Load and interaction (measured)

- Login page DOMContentLoaded: **186 ms** (local).
- Login → Portfolio Overview interactive: ~2.8 s wall in the sandbox
  (includes credential check, session, overview query, React mount).
- JS heap after a full 11-view tour: **~14 MB used** — no leak signal
  across the tour; views unmount cleanly (Chart dispose verified in
  code).

## API latency (authenticated, demo dataset, server-local)

| Endpoint | Observed |
|---|---|
| `GET /api/overview` | 3–7 ms |
| `GET /api/buildings?limit=200` | 3–7 ms |
| `GET /api/migration/metrics` | 3–7 ms |
| `GET /api/reports/buildings-by-governorate` | 3–7 ms |
| `GET /api/audit?limit=100` | 3–7 ms |

These are single-digit because the demo dataset is small (7 buildings,
11 tenders). They prove the endpoints add no pathological overhead
(overview runs its aggregates in parallel), not production latency at
GAEB data volumes — that remains for the pilot environment.

## Polling and rendering behavior
- Migration live monitor polls the progress endpoint only while its
  panel is mounted; no global polling loops exist elsewhere.
- School Map sorting/pagination operate on the loaded ≤200-row set —
  instant at this scale; the known limit is the API cap (R-C-3).
- No layout-shift defects were observed in the screenshot matrices
  (fixed rail, skeleton states on the overview).

## Backend baseline preserved
The certification's backend changes are three additive GET endpoints
and one widened SELECT; the integration suite (65 tests) passes with
the same migration benchmarks standing from Phase 7 (2,024,836
records at 4,533 rec/s — not re-run in this UI certification).
