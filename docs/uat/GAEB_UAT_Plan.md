# GAEB UAT Plan

Status: **NOT STARTED** — UAT begins only when GAEB names its participants
(B-12) and supplies the Priority-1 extracts (Data Request Pack). Synthetic
executions by the delivery team are engineering tests, never UAT.

## Participants (to be named by GAEB)
- IBM i administrator (extraction + manifest evidence)
- School Map business owner (Arabic integrity + building verification)
- Finance reviewer (control totals + certificate values)
- Security reviewer (roles, approvals, audit)
- Acceptance signatory

## Entry criteria
1. Priority-1 extracts delivered and checksum-verified.
2. Customer-mode mapping approvals recorded against GAEB's signed mapping review.
3. UAT environment deployed from the release candidate (deployment runbook).
4. Test cases (`GAEB_UAT_Test_Cases.csv`) agreed; severity scheme agreed
   (Blocker / Major / Minor).

## Execution rules
- Every case records actual result + evidence reference; a case without evidence
  is NOT RUN, not Pass.
- Defects go to `GAEB_UAT_Defect_Register.csv`; Blockers stop the affected
  module's acceptance, not silently the whole programme.
- Reconciliation cases (UAT-13/14) compare against GAEB's own manifest figures,
  never against the platform's internal numbers alone.

## Exit criteria
- All Blocker/Major cases Pass; Minors have agreed workarounds or fixes.
- Reconciliation equations hold against GAEB figures for every pilot file.
- Sign-off completed on `GAEB_UAT_Signoff_Template.md`.
