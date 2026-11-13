# GAEB Modern Platform — Customer Pilot Launch Package (EN)

## A. Executive pilot invitation
GAEB is invited to begin a governed pilot of its modern platform:
the bilingual successor to the six AS/400 business systems,
built and rehearsed end to end on synthetic data. The pilot
migrates a first, bounded set of GAEB's own data under written
authorization, with every record accounted for and every
approval independently verified inside the system itself. We ask
GAEB's leadership for four things: a signed charter, one day of
decisions, a first extract authorization, and named participants.

## B. One-day decision workshop
Eight business decisions (BD-01…BD-08) with evidence, options,
and consequences prepared in advance. Two gate the start:
**BD-07 duplicate handling** and **BD-08 historical scope**.
Each closes with a recorded decision and an owner.

## C. Pilot charter
Ready for GAEB's formal review and signature (full text in the
Phase 11 package): objectives, scope, three environments, roles,
entry/exit conditions, change control, rollback, escalation.

## D. First extract authorization (proposed)
Proposed pilot extracts: **PBLBULDG** (building registry,
School Map) and **PBPTNDR** (tenders register) from library
NEWLIBGAEB — *subject to GAEB's confirmation of exact scope and
classification*. Authorization is recorded in the platform as
evidence, independently verified, and bound to the exact file
hash of the authorized extract: a substituted file is refused.

## E. Infrastructure checklist (GAEB IT)
One pilot host (4 vCPU / 8 GB / 200 GB SSD) · PostgreSQL 16 ·
TLS-terminating proxy · backup storage with a completed restore
drill · a monitored alert destination that has received a test
alert · named administrator and user accounts. The platform's
automated preflight (16 checks) qualifies the host.

## F. UAT participation
Named GAEB users per module (School Map, Tenders, Certificates,
Migration review, Arabic workflow, Administration) execute 20
prepared scenarios over three weeks, with defect logging,
severity triage, retest, and per-module sign-off.

## G. Pilot launch schedule
Week 0: charter + workshop + authorization. Week 1 (P0): host
qualification, backup drill, accounts. Weeks 2–3: first dataset
cycle (intake → import → reconciliation → GAEB sign-off).
Weeks 2–5: UAT in parallel. Weeks 6–9: pilot operation + review.

## H. Customer acceptance process
Reconciliation packages per batch (source = loaded +
quarantined, exact totals) signed by GAEB's data owner;
exceptions recorded in writing; UAT sign-off per module; the
pilot closes with a launch decision report stating, per gate,
what the evidence shows. No step is represented as approved
until GAEB records it.
