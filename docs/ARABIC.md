# Arabic Data Integrity Specification (implemented subset)

- Per-field encoding is a mapping-register decision, never a global assumption (B-05).
- Decoders (platform/src/arabic.ts): IBM420 and IBM864 (EBCDIC) and Windows-1256, driven by
  tables generated from glibc charmaps (`platform/tools/gen_codepages.py`); IBM864 output is
  unshaped from presentation forms to standard letters as part of decoding.
- IBM425 is intentionally NOT decoded by fallback: it throws, and the record is quarantined.
  Silent substitution is how Arabic names get corrupted in migrations.
- Unmapped bytes throw; the migration engine must quarantine the record, never insert a
  replacement character.
- The original source bytes/value are preserved in staging; the decoded value is separate.
- `normalizeForSearch` (alef/yeh unification, tatweel/diacritic strip, Arabic-Indic digits)
  is for search indexes only — never applied to stored identity fields or reference codes.
- Mojibake detection is a flag for human review, never an automatic repair.
- Tests: platform/tests/arabic.test.ts — CP1256 and IBM420 vectors are byte-exact against
  independently generated data; all passing (docs/TEST_LOG_2026-11-12.txt).
