# 08 — Pilot Execution Plan

## Shape
A bounded pilot, in five stages, each with entry and exit criteria.
Durations are planning estimates for GAEB's scheduling — they
assume decisions and access arrive on time; they are not
commitments about GAEB's internal timelines.

| Stage | Content | Entry | Exit |
|---|---|---|---|
| P0 — Provision | Pilot + demo environments on GAEB-approved infrastructure; accounts; (if Docker route chosen) first compose run + smoke script | Infrastructure approval | Smoke verification green; §02 checklist signed off by IT |
| P1 — Decide | BD-01…BD-08 decision sessions; thresholds in §05 approved or amended | Business owners named | Decisions recorded; rules/tests activated |
| P2 — Qualify data | Authorized extracts for 1–2 pilot files (School Map first — it is the most completely mapped); preflight → import → reconciliation → sampled equivalence | Written extract authorization (B-06) | §05 thresholds met per batch; equivalence sample signed |
| P3 — UAT | §07 pack executed by named participants on qualified data | P2 exit; participants named (B-12) | Exit criteria in §07; defects triaged |
| P4 — Pilot operation | Limited live use by the pilot group; monitoring per §09; weekly reconciliation + ops review | P3 exit | Pilot review meeting; go/no-go input for acceptance |

## Roles
GAEB: executive sponsor, business owners (per BD register), IBM i
admin, data owner, security reviewer, UAT participants, IT
operations. Veebase: platform lead, migration engineer, support
contact. Named individuals are recorded in the pilot charter —
**no names are asserted in this package**.

## Explicit non-goals for the pilot
Full-history migration (unless BD-08 decides otherwise), production
cutover, public exposure, and any module whose BD dependencies are
undecided being treated as final.
