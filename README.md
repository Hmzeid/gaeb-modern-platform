# GAEB Modern Platform — AS/400 Migration POC

Modern replacement POC for the Egyptian General Authority for Educational Buildings (GAEB) AS/400 system (IBM i V6R1, library NEWLIBGAEB), built by Veebase from the system's own source listings.

## What's here
- **The application** (`client/`, `server/`, `drizzle/`) — bilingual EN/AR web platform with real login/roles and audit log: Dashboard, Reference Data, School Map (building registry + projects), Budget, Purchases & Contracts (tenders/offers/claims), Payment Certificates (draft → submitted → approved → paid), Estimates/BOQ, Real Estate (lands, leases, expropriation), and a Migration Center (legacy inventory browser, field-mapping viewer, ETL job runner).
- **`migration/`** — the migration package generated from 502 parsed AS/400 SEU source listings:
  - `parse_legacy.py` — parser that extracts files/fields/keys/programs from the SEU listing PDFs
  - `gen_ddl.py` — DDS → PostgreSQL DDL generator
  - `schema.sql` — generated PostgreSQL schema (125 tables)
  - `field_map.csv` — 1,107-field mapping register with type-inference rationale
  - `legacy_inventory.json` — full machine inventory: 169 data files (135 PF + 34 LF), 1,134 fields, 333 programs
  - `business_summary.md` / `process_summary.md` — business and process analysis per subsystem
  - `gaeb-as400-modernization-blueprint.pdf` — the modernization blueprint (architecture, ETL path, phased delivery plan, gaps)

## Legacy estate at a glance
502 source members · 169 data files · 1,134 fields · 333 programs (270 RPG) · 6 subsystems: School Map, Budget, Purchases & Contracts, Technical Abstracts, Estimates (BOQ), Real Estate.

## Notes
- Demo login accounts are shown on the app's sign-in screen (POC only).
- Known gaps (see blueprint §8): PBA3* Budget master DDS was not in the source delivery; Arabic headings in the PDF listings are codepage-garbled and must be recovered via CCSID-correct extraction from the live system.
