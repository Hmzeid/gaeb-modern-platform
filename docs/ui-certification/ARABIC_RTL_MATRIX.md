# Arabic / RTL Verification Matrix — UI Certification

Method: every route captured in Arabic at four viewport classes
(`screenshots-final/*-ar-*.png`, 44 shots) and compared against its
English counterpart; the browser E2E asserts `dir=rtl` and localized
shell chrome after switching; the unit suite asserts dictionary parity
and stage-label coverage in both languages.

Legend: ✓ verified in final screenshots · E2E = asserted by the
browser test · — not applicable.

| Area | EN LTR | AR RTL | Notes |
|---|---|---|---|
| Shell / rail position | ✓ | ✓ E2E | Rail mirrors to the right; group labels localized |
| Topbar search + language toggle | ✓ | ✓ | Toggle label shows the target language |
| Portfolio Overview | ✓ | ✓ | KPI order mirrors; charts follow font; donut drill-down works in both |
| Geographic Intelligence | ✓ | ✓ | Dark panel mirrors; gauge percent localized (`٥٠٪` — fixed in this certification, was Latin digits); P-codes stay Latin (correct: identifiers) |
| School Map | ✓ | ✓ | Arabic building/village names preserved verbatim incl. shaping; table alignment mirrors; sort/pagination identical |
| Budget | ✓ | ✓ | Money renders with Arabic-Indic digits and Arabic currency label; amounts remain exact (F-08) |
| Tenders | ✓ | ✓ | 12 stage labels localized (`st_*`); stepper direction mirrors |
| Certificates | ✓ | ✓ | Status/stepper localized; deduction lines exact |
| Estimates | ✓ | ✓ | Item descriptions bilingual fields; revision list mirrors |
| Real Estate | ✓ | ✓ | Status chips localized; land numbers stay Latin per identifier rule |
| Reports | ✓ | ✓ | Denied state localized for non-finance roles |
| Migration Center | ✓ | ✓ | Intake/job/inventory status labels localized (F-09/F-13); batch IDs, hashes, file names stay Latin |
| Administration | ✓ | ✓ | User names show Arabic where recorded; audit actions localized where keyed |

## Identifier and number rules (verified)
- Latin preserved: batch IDs (`mig-…`), SHA-256 prefixes, file names,
  governorate P-codes (EG22), legacy building codes.
- Localized: percentages, dates, money digits, counts.
- Arabic source text (building names, remarks) is displayed exactly
  as stored — the platform never normalizes stored Arabic
  (`arabic.ts` rules), and search normalization is display-neutral.

## Residuals
- R-C-4: the import-result toast is an English operator string.
- Fonts: the sandbox cannot reach Google Fonts, so screenshots fall
  back to system fonts; on a normal network Inter / IBM Plex Sans
  Arabic load. Text metrics may differ slightly on the target network.
