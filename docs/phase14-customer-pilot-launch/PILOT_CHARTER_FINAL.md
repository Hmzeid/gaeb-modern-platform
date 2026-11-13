# GAEB Modern Platform — Pilot Charter (FINAL, for signature)

*Version: Phase 14 final draft for GAEB review. All name fields
are intentionally blank — GAEB appoints its officials; Veebase
does not prefill them.*

## Parties and roles
| Role | Name | Organization |
|---|---|---|
| Pilot Sponsor | __________ | GAEB |
| Business Owner | __________ | GAEB |
| Technical Owner | __________ | GAEB |
| Data Owner | __________ | GAEB |
| Security Representative | __________ | GAEB |
| Delivery Lead | __________ | Veebase |

## Objectives
Qualify the first real datasets (PBLBULDG, PBPTNDR — subject to
GAEB confirmation) through controlled migration and
reconciliation; close BD-01…BD-08 on evidence; execute customer
UAT; and produce a production-readiness gap assessment. The
pilot is not production authorization and not final acceptance.

## Scope
**Included:** School Map and Tenders modules + migration
qualification; Portfolio Overview, Geographic Intelligence,
Reports, Migration Center, Administration for UAT; the pilot
authorization workflow end to end.
**Excluded:** Budget appropriations transform (source DDS
outstanding — BD evidence), Estimates operational transform
(item master outstanding), production cutover, any dataset
beyond the authorized extracts, any change to the AS/400
(the platform never writes to the source system).

## Data and hosting boundaries
Data classification per GAEB policy (confirmed at signing).
Pilot data lives only in the pilot environment, on GAEB's
host, under the 15-step intake protocol. The demonstration
environment never holds customer data. Extracts are retained
for the pilot duration and then deleted or archived strictly
per GAEB's written instruction, with a deletion record.

## Procedures
Migration per the intake protocol and the platform's enforced
authorization model: no import without an active pilot, verified
evidence, and a dataset bound to the authorized file hash.
Reconciliation per batch, signed by the Data Owner. UAT per
the 20-scenario package, executed by named GAEB users.

## Acceptance thresholds (proposed; binding on adoption)
Record accounting 100% · reconciliation equation exact ·
money totals exact · Arabic sample fidelity 100% · UAT
critical path passed · exceptions closed by recorded decision.

## Incidents, escalation, change control
S1 (integrity/security): stop affected work same day, Sponsor
notified. Weekly pilot board. Scope changes only by written
change control referencing this charter. Rollback triggers:
reconciliation failure on a batch, S1 security event, or
authorization-evidence invalidation — rollback restores the
pre-pilot environment state from verified backups.

## Alignment with the platform authorization model
This charter, the scope approval, the BD register, and the
extract authorization each enter the platform as evidence
records, independently verified by a GAEB-side verifier role
before the pilot can activate. Signature below authorizes the
charter; platform activation additionally requires those
verifications — by design.

## Signatures
GAEB Sponsor: __________ Date: ______
GAEB Technical Owner: __________ Date: ______
GAEB Data Owner: __________ Date: ______
Veebase Delivery Lead: __________ Date: ______
