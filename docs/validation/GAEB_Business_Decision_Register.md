# GAEB Business Decision Register (Phase 7, Workstream F)

**On the count:** the Phase 6 results document said "seven decisions" and its
§5 listed seven numbered items, but item 5 bundled two independent rules
(CHKDIG and CHK5DAYS). The register below is the corrected, authoritative
form: **eight decisions, BD-01…BD-08**, one rule each. Nothing was dropped;
one bundle was split. All statuses: **AWAITING GAEB DECISION**. The platform
implements no assumption for any of them (the affected transforms stay
gated or partial, as recorded).

| ID | Business question | Legacy evidence | Candidate interpretations | Impact if decided | Validation after approval | Decision owner |
|---|---|---|---|---|---|---|
| BD-01 | What does TOT (REMV01PF) measure? | Field exists in the expropriation file; no program computes compensation from it in the delivered sources | (a) total compensation; (b) total area/value of the property; (c) accumulated payments | Decides whether TOT maps to compensation or stays lineage-only | Recompute 20 sampled cases from legacy listings | GAEB Real Estate head |
| BD-02 | Where do English building names come from? | No English name field in PBLBULDG | (a) GAEB supplies a translation file; (b) transliteration table approved by GAEB; (c) left empty | Display/report completeness | Sampled bilingual review | GAEB School Map owner |
| BD-03 | Which INV001PF definition is authoritative? | Two conflicting DDS copies (BIL02SRC vs NGHADA) | Pick one; the other is archived as historical | Settles the certificate header mapping | DSPFFD on the live system compared field-by-field | GAEB IBM i admin + Technical Abstracts owner |
| BD-04 | What are the CUTKND deduction kinds and formulas? | Programs branch on the codes; enumeration not delivered | GAEB supplies the table + one worked example per kind | Certificate NET becomes computable and checkable | Recompute certified abstracts end-to-end (EX-registers) | GAEB Technical Abstracts owner |
| BD-05 | What is the CHKDIG check-digit algorithm? | Legacy field + validation programs; algorithm not delivered | GAEB supplies the algorithm or the validating program source | Tender numbers become validatable on entry | Known-good/known-bad number vectors | GAEB Purchases owner |
| BD-06 | What calendar does CHK5DAYS use? | Program enforces a deadline; rule inferred as 5 working days Fri/Sat weekend, UNVERIFIED | (a) confirm Fri/Sat; (b) Sat/Sun; (c) official-holiday calendar applies | Tender deadline warnings become authoritative | Deadline cases around weekends/holidays vs legacy behaviour | GAEB Purchases owner |
| BD-07 | What are the duplicate semantics for real files with repeated legacy keys? | POC data shows repeated keys occur | Current behaviour: first record loads, later duplicates quarantined with evidence (a) confirm; (b) last-wins; (c) per-file rule | Decides loaded-vs-quarantined outcomes on real data | Pilot file with known duplicates reconciled with GAEB | GAEB data owner |
| BD-08 | What historical scope migrates? | Legacy system live since years; archives unknown | (a) full history; (b) cut-off year; (c) active records + summary history | Sizes the migration and the equivalence sampling | Counts per year from DSPFD/queries agreed before import | GAEB business authority |

Regression tests to activate after each approval are recorded in
docs/validation/GAEB_Business_Rules_Register.md alongside BR-01…BR-08; a
decision without its test does not close.
