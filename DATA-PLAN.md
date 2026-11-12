# Data Plan

## Context provenance
- `BUILD SPEC FROM THE LEGACY ANALYSIS (parsed from 502 unique AS/400 SEU source listings, IBM i V6R1, library NEWLIBGAEB — the Egyptian General Authority for Educational Buildings)` (verbatim build request; defines all numbers, file names, keys, and module structure)
- `Seed realistic starter data across all modules so every screen works on first open.` (verbatim build request; user explicitly requested seeded demo/start data — this is a POC)
- `bilingual (English/Arabic toggle with RTL) fullstack web app, real login with roles (Admin, Budget Officer, Contracts Officer, Technical Officer, Viewer)` (verbatim build request)

## Tested sources
No external HTTP sources are used. All content is derived from the build spec itself (legacy analysis numbers, file/member names, field counts, keys) plus user-requested realistic Egyptian reference data (governorates with Arabic names). Data is persisted server-side in ctx.db via typed actions; seeding happens once via a post-submit `ensureSeed` action that checks row counts before inserting, so user edits are never overwritten.

## Long-term data behavior
- **Refresh policy**: No external refresh; all data is user/app-owned in ctx.db. No cron.
- **Growth**: Users add/edit/delete records in every module via CRUD actions; migration jobs append job-log rows and load staging rows into modern tables.
- **Ordering**: Lists ordered by code/created order; audit log newest first; migration jobs newest first.
- **Time semantics**: Dates stored as ISO date strings (fiscal/calendar dates as entered); audit timestamps are creation instants rendered viewer-local.

## Rejected approaches
- **Tried**: External data feeds / live AS/400 connection
  **Why rejected**: POC scope — the legacy system is not reachable; the spec requires staging-row ETL simulation inside the app instead.
- **Imagery**: Imagery not needed: this is a data-dense enterprise admin/migration console; no visual subjects are depicted and photos would add noise. Design uses typography, color, and data visualization (bars/charts) only.
