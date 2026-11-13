# 06 — Business Decision Register (Customer-Ready)

Eight decisions are owed by GAEB business owners. All statuses:
**AWAITING GAEB DECISION.** The platform implements no assumption
for any of them; affected transforms stay gated or partial, as
recorded. "Engineering lean" below is a recommendation for
discussion — it decides nothing. Full evidence trail:
`docs/validation/GAEB_Business_Decision_Register.md` and the
Business Rules Register (a decision without its regression test
does not close).

| ID | Question (owner) | Options | Engineering lean | Impact of deciding | Approval required |
|---|---|---|---|---|---|
| BD-01 | What does TOT (expropriation) measure? (Real Estate head) | (a) total compensation (b) total area/value (c) accumulated payments | None — evidence is genuinely ambiguous; do not guess | TOT maps to compensation, or stays lineage-only | Written decision by the Real Estate head |
| BD-02 | Source of English building names? (School Map owner) | (a) GAEB translation file (b) GAEB-approved transliteration table (c) left empty | (a) if a file exists; otherwise (c) over an unapproved transliteration | Display/report completeness in English | Decision + the file/table if (a)/(b) |
| BD-03 | Which INV001PF definition is authoritative? (IBM i admin + Technical Abstracts owner) | The BIL02SRC copy, or the NGHADA copy | Whichever matches a live DSPFFD — evidence, not preference | Settles the certificate-header mapping | Joint sign-off after field-by-field DSPFFD comparison |
| BD-04 | CUTKND deduction kinds + formulas? (Technical Abstracts owner) | GAEB supplies the table + one worked example per kind | n/a — this is evidence delivery, not a choice | Certificate NET becomes computable and independently checkable | Table + examples accepted by the owner |
| BD-05 | CHKDIG check-digit algorithm? (Purchases owner) | GAEB supplies the algorithm or the validating program source | n/a — evidence delivery | Tender numbers become validatable at entry | Source/algorithm accepted by the owner |
| BD-06 | CHK5DAYS calendar rule? (Purchases owner) | (a) 5 working days, Fri/Sat weekend (current unverified implementation) (b) Sat/Sun (c) official-holiday calendar | (a) matches the observed program behavior; must be confirmed, not assumed | Deadline warnings become authoritative | Written confirmation by the Purchases owner |
| BD-07 | Duplicate semantics for repeated legacy keys? (Data owner) | (a) first-wins, later duplicates quarantined (current behavior) (b) last-wins (c) per-file rule | (a) — it preserves evidence and never overwrites silently | Decides loaded-vs-quarantined outcomes on real data | Written decision by the data owner |
| BD-08 | Historical scope of migration? (Business authority) | (a) full history (b) cut-off year (c) active records + summarized history | (c) for the pilot — bounds pilot size while keeping history reachable later | Sizes the migration and the equivalence sampling | Written decision by the business authority |

## How a decision closes
Decision recorded with owner + date → the corresponding business
rule (BR-xx) and its regression test are activated → the gated
transform/mapping is unblocked → sampled validation (per the
register's validation column) is executed and filed. Estimated
engineering effort per decision after approval: days, not phases —
the gates were built to open.
