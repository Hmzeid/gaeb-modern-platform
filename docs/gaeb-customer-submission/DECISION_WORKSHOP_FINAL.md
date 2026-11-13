# Decision Workshop — Final Execution Kit

One day. Facilitator: Veebase delivery lead. Scribe records
into the register in the room. **Every decision starts OPEN and
closes only by a recorded, signed decision of the named GAEB
authority.** Evidence sheets + register workbook:
`02-decisions-and-approvals/BD_DECISION_REGISTER.md`.

| ID | Business question | Options | Impact | Recommendation | Approving role | Regression test |
|---|---|---|---|---|---|---|
| **BD-07** ⭐ | Repeated legacy key in an extract: which record is the building/tender of record? | (a) first loads, later quarantined (current) (b) last wins (c) per-file rule | Reconciliation counts; registry correctness | **(a)** — preserves source order evidence; duplicates stay visible | GAEB Data Owner | BR-07 |
| **BD-08** ⭐ | How much history migrates in the pilot? | (a) full (b) cut-off year (c) active + summary | Volume, duration, fidelity sampling | **(c) for the pilot** — fastest path to signed evidence | GAEB Business Authority | BR-08 |
| BD-03 | Which INV001PF definition is authoritative? | The one matching live DSPFFD | Certificates transform correctness | Whichever DSPFFD proves | IBM i Admin + Abstracts Owner | BR-03 |
| BD-04 | CUTKND kinds + formulas? | GAEB table + worked example per kind | Certificate money | None — GAEB supplies the rule | Abstracts Owner | BR-04 |
| BD-06 | CHK5DAYS calendar? | (a) Fri/Sat (current) (b) Sat/Sun (c) holiday calendar | Tender deadline checks | (a) unless GAEB states otherwise | Purchases Owner | BR-06 |
| BD-05 | CHKDIG algorithm? | GAEB supplies algorithm/source | Tender reference validation | None — GAEB supplies | Purchases Owner | BR-05 |
| BD-02 | Source of English building names? | (a) GAEB translation file (b) transliteration table (c) leave empty | Bilingual completeness | (a) if the file exists, else (c) | School Map Owner | BR-02 |
| BD-01 | What does TOT (REMV01PF) measure? | (a) total compensation (b) total area/value (c) accumulated payments | **A compensation figure — legally/financially sensitive** | **None. GAEB defines it; the platform implements the definition as recorded.** | Real Estate Head | BR-01 |

⭐ = gates the first import. Register signature block: per
decision — decision, rationale, owner name/role, date,
signature. The signed register enters the platform as evidence
(condition `bd_decisions`) and is independently verified like
every other approval.
