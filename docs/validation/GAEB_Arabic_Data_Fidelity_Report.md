# GAEB Arabic Data Fidelity Report (Phase 5, Workstream F)

Executed: `platform/tests/arabic-fidelity.test.ts` (5 tests) plus the standing
arabic/engine suites. All fixtures synthetic.

| Scenario | Result |
|---|---|
| IBM420 Arabic name round-trip through a fixed-width record | PASS — decoded text identical; original bytes kept as lineage (`record.raw`) |
| EBCDIC padding (0x40) | PASS — padding is presentation; trailing pad stripped, content intact |
| Diacritics + tatweel | PASS — preserved in the stored value; search normalization produces a SEPARATE string and never mutates the original |
| Mixed Arabic/English in one delimited field (windows-1256) | PASS — both scripts intact |
| Arabic-Indic digits (١٢٣٤٥) | PASS — preserved as characters, never folded to ASCII digits |
| IBM864 shaped presentation forms | PASS (standing suite) — unshaped to standard letters during decoding |
| Windows-1256 phrase vector (independent Python-generated) | PASS (standing suite) |
| Unmapped byte in a table-driven codepage | Decoder throws; the record quarantines with the reason — no replacement character is ever substituted |
| IBM425 | NOT SUPPORTED — no verified table in this build; every record under a 425 layout quarantines (B-05). Recognized ≠ supported |
| NUL byte in character data | Rejected at parse (padding/CCSID mismatch signal) |

## Fidelity model (four distinct representations, never conflated)
1. **Original source bytes** — preserved per record (`_raw_hex` in staging,
   `raw` on the decoded record).
2. **Decoded text** — the faithful Unicode value; stored.
3. **Normalized text** — search-only, derived on demand, never stored over (2).
4. **Display representation** — frontend rendering incl. RTL; does not feed back.

## Customer dependencies (unchanged)
Per-file/field CCSID confirmation from the live system (B-05); if any file is
CCSID 425, GAEB must confirm it before delivery so a verified table can be
supplied — until then such a file cannot be migrated, by design.
