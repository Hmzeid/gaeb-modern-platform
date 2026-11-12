# IBM i Export Format Compatibility — what the migration engine actually supports

Verified against the code and the automated tests (tests/formats.test.ts,
tests/migration2.test.ts, integration suite). Statuses are exact:

| # | Delivery format | Status | Decoder | Notes |
|---|---|---|---|---|
| A | IBM i save file (SAVOBJ / SAVLIB) | **UNSUPPORTED for direct import** | — | A save file is an IBM i save-object format, not a record image. The importer cannot and does not parse it. Supported route: GAEB restores/extracts on the IBM i side (RSTOBJ to a work library, then CPYF/CPYTOIMPF to one of the formats below), or a separately licensed extraction tool produces a stream file. Any claim otherwise would be false. |
| B | CPYTOIMPF delimited (CSV etc.) | **SUPPORTED** | importDelimited | Full CSV semantics: quoted fields, doubled-quote escapes, embedded delimiters and line breaks, configurable delimiter + decimal separator, thousands group separators, trailing-sign and (parenthesized) negatives, explicit null markers (numeric nulls are quarantined, never zero-filled), YYYYMMDD dates validated as real calendar dates, whole-file decode in the declared stream code page (Arabic verified for windows-1256 and UTF-8). Numeric fields are decimal TEXT here — never binary. |
| C | CPYTOIMPF fixed-format text | **SUPPORTED** | importFixedText | Same record geometry as the DDS layout, but numeric fields are character representations. Handles EBCDIC stream code pages (digits F0–F9, minus 60, point 4B) and ASCII/UTF-8. Native overpunch characters are rejected — their presence proves the format assumption wrong. |
| D | Native binary record images | **SUPPORTED** | importFixedWidth (+ streaming variant) | Packed and zoned decimals decoded from raw bytes, per-field CCSID for character fields (IBM420/IBM864/Windows-1256 tables; IBM425 fails loudly — B-05). Only for extracts verified to contain raw record bytes (e.g. CPYF to a stream file without conversion, or a binary transfer of the file). NUL bytes in character fields are quarantined (padding/CCSID mismatch), never crashed on. |

## Format safety rules (enforced in code)
- The format is part of the registered layout and covered by its hash: an extract is
  decoded only under the format it was registered as. Feeding fixed-text to the
  binary decoder (or the reverse) throws before any record loads.
- Layouts are structurally verified on every run (field geometry, decimal scale,
  supported encodings, delimiter/decimal conflicts).
- Staging tables carry no legacy primary keys by design (evidence store): identity
  is (_batch_id, _source_offset). Duplicate natural keys inside one extract are
  quarantined by the engine with reasons; the same key across batches is legitimate.

## What a save-file delivery would require (if GAEB prefers it)
1. GAEB restores the save file on their IBM i into a scratch library (their system,
   their authorities — Veebase never writes to the source).
2. From the restored objects, GAEB produces format B, C, or D above with the
   documented commands/parameters, plus DSPFFD metadata and control totals.
3. Alternatively GAEB may name a mutually agreed extraction tool; its output still
   lands as B, C, or D and is verified against the registered layout before loading.
