# GAEB Business Equivalence Matrix

Status of the whole matrix: **NOT VERIFIED** — equivalence requires representative
customer data, authoritative legacy outputs, and GAEB-approved criteria, none of
which have been received. This matrix defines what will be proven, per module,
and what evidence each proof needs. "Executable today" means the mechanism runs
on synthetic fixtures; it is not an equivalence claim.

## School Map — buildings (PBLBULDG → app.buildings)
| Dimension | Mechanism | Customer evidence required |
|---|---|---|
| Record completeness | Reconciliation endpoint: source = loaded + quarantined | Live extract + DSPFD count |
| Field completeness | Approved mapping (BLCD, SHNM→name_ar, VGCD) | Signed mapping review (customer mode) |
| Referential integrity | VGCD must resolve to villages reference | Live reference files |
| Arabic preservation | Per-field CCSID decode; originals never normalized | Sample records GAEB verifies visually |
| Exceptions | name_en unmapped (never fabricated) — see Exceptions Register | GAEB confirms or supplies English names |

## Budget — BLOCKED (B-01)
No operational transform exists: the PBA3* master DDS was never delivered.
Validation cannot start until DSPFFD evidence arrives. Staging + reconciliation
mechanisms are module-agnostic and ready.

## Purchases & Contracts — tenders (PBYTENDR → app.tenders)
Executable today (synthetic): TYPE/TETNNO/TNANM mapping, Arabic title intact.
Customer evidence: live extract, tender status enumerations (TESU/FINMOD) with
Arabic screen labels (Questionnaire Q8), CHK5DAYS worked examples (B-04).

## Technical Abstracts — certificates (INV001PF headers → app.certificates)
Executable today (synthetic): header load, gross = BILVLU, legacy key preserved.
Open: B-02 authoritative definition; B-08 deduction model — certificates are
loaded with deductions 0 and flagged; equivalence of NET values is not claimed
until CUTKND evidence arrives and the line/deduction transform is approved.

## Estimates & BOQ — BLOCKED (B-13)
Catalogue-gated estimate workflow is implemented (structural PMPITMAR rule);
the migration transform cannot be specified until GAEB identifies the item-master
physical file and supplies its DDS.

## Real Estate — expropriation (REMV01PF → app.expropriation_cases)
Executable today (synthetic): pre-decree stage assignment (REMV01 semantics),
building join, migration-key idempotency. Exception: TOT is deliberately
unmapped (meaning unconfirmed) — see Exceptions Register.
Customer evidence: decree workflow examples (REMV01→REMV02 transition cases).
