# GAEB Phase 6 UAT Execution Pack

Status: **NOT STARTED** — no GAEB participants have been named (B-12) and no
customer environment session has taken place. This pack makes execution a
turnkey exercise when they are.

## Contents
- 30 test cases: docs/uat/GAEB_UAT_Test_Cases.csv (each with requirement,
  preconditions, input data, steps, expected result; actual/evidence/status
  columns are filled during execution, never before).
- Results sheet: GAEB_Phase6_UAT_Results.csv (initialized NOT RUN for all 30).
- Evidence template + defect register + sign-off: docs/uat/ (Phase 4 pack).

## Execution protocol
1. Environment: the pilot environment (checklist signed) or the Docker-
   deployed stack once certified — record which, with the commit.
2. Participants execute; the delivery team observes and supports but does not
   execute customer cases.
3. Every case produces an evidence record at execution time. A case without
   evidence is NOT RUN.
4. Defects enter the defect register with severity; Blockers pause the
   affected module's acceptance.
5. Sign-off on GAEB_Phase6_UAT_Signoff.md only after the exit criteria in the
   UAT Plan are met.

## Coverage map (categories → cases)
Login/authorization 01–03 · intake 04–05, 24 · mapping 06 · approvals 07–08, 29 ·
import 09–11, 25–27 · duplicates 12 · reconciliation 13–14, 30 · Arabic 15 ·
finance 16 · workflows 17–18 · audit 19 · export 20 · failure handling 21–22 ·
recovery 23, 26, 28 · backup restoration 28 · large imports 25.
