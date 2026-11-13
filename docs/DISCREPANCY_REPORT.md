# Discrepancy Report — Legacy Inventory, Schema and Mapping Register

Generated during Milestone 1 (production-upgrade branch). All figures below were recomputed
from the committed artifacts (`migration/legacy_inventory.json`, `migration/schema.sql`,
`migration/field_map.csv`) — not copied from earlier documentation.

## Verified counts

| Measure | Verified value | Where |
|---|---|---|
| Unique source members analyzed | 502 | legacy_inventory.json (169 data files + 333 programs) |
| Physical file (PF) definitions | 135 | inventory |
| Logical file (LF) definitions | 34 | inventory |
| **Distinct PF member names** | **125** | inventory — 8 members are defined more than once (10 extra definitions) |
| Total PF field instances | 1,107 | inventory = field_map.csv rows (1,107) — these two agree |
| Total fields parsed in the original POC report | 1,134 | includes 27 fields belonging to non-PF record formats counted during the first parser pass; the operational PF field count is 1,107 |
| CREATE TABLE statements in schema.sql (v1) | 135 | one per PF *definition*, not per distinct member |
| Distinct qualified table names in v1 | 133 | 2 names repeated (defect, see D-2) |
| Programs | 333 (270 RPG, 1 CL, 62 unclassified) | inventory |

## Discrepancies found and resolved

- **D-1 — "125 generated tables" was wrong as stated.** 125 is the number of *distinct legacy
  member names*. The v1 generator emitted 135 CREATE TABLE statements (one per definition,
  including duplicates). Corrected in v2: **126 target tables** = 125 distinct members
  + 1 conflicting-variant table (D-3).
- **D-2 — Duplicate table names in v1 DDL.** `abstracts.inv001pf_nghada` and
  `abstracts.inv010pf_nghada` each appear twice (the v1 collision-renaming reused the same
  suffix for two different definitions). `CREATE TABLE IF NOT EXISTS` would silently skip
  the second definition — a real data-loss defect. Fixed in v2 by grouping definitions per
  member before naming.
- **D-3 — INV001PF has conflicting definitions.** Defined 3 times (BIL02SRC, NGHADA ×2) and
  the definitions are **not identical**. v2 keeps the majority definition as
  `abstracts.inv001pf` and emits the differing one as `abstracts.inv001pf_bil02src_variant`,
  both flagged CONFLICT in the mapping register. **Resolution requires customer evidence**
  (which source file is authoritative on the live system) — see BLOCKERS.md B-02.
- **D-4 — Identical duplicate definitions (merged in v2, lineage preserved):**
  PBLSROM (×2), PBLLEVEL (×2), INV010PF (×3), REMV09PF (×2), REMV04PF (×2), GRN002PF (×2),
  GRN001PF (×2). These are the same member delivered in more than one source file/folder.
  Merging them removes 39 duplicate field instances: register v2 has **1,068 unique mapped
  fields** vs 1,107 field instances. Nothing was discarded silently — every merged
  definition is listed in the register's `source_lineage` column.
- **D-5 — 62 programs are type-unclassified** in the POC parse (the "OTHER" bucket: display
  files, printer files, menus and CL-like members whose listings did not match the RPG/CL
  heuristics). They are carried in the coverage matrix as "Not implemented — type
  unconfirmed, requires source review", not silently dropped.
- **D-6 — Field total 1,134 vs 1,107** explained above (27 non-PF record fields). All
  downstream documents must use: 135 PF definitions / 125 distinct members / 1,107 PF field
  instances / 1,068 unique mapped fields.

## Corrected artifacts (this branch)

- `migration/reconciled/schema_v2.sql` — 126 tables, one per distinct member + INV001PF variant.
- `migration/reconciled/mapping_register_v2.csv` — 1,068 rows with approval status
  (all "Generated — pending approval"; none are customer-approved yet) and full lineage.
- `migration/reconciled/coverage_matrix.csv` — all 502 legacy objects with honest modern
  status: 30 partially implemented, 472 not implemented, **0 implemented-and-verified**.
- `migration/gen_ddl_v2.py` — the corrected generator (regenerates both files deterministically).

## Still unresolved

- INV001PF authoritative definition (B-02).
- PBA3* Budget master DDS absent from the delivery — Budget PFs that exist only as logical
  files cannot be converted until the physical definitions are obtained (B-01).
- Field types in the register are *inferred* (decimals>0 → NUMERIC; name/length heuristics
  otherwise). Every inference is recorded in the register's `inference_rule` column and
  requires sign-off against live DDS before production load.
