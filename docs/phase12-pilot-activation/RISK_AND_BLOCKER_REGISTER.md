# Phase 12 — Risk & Blocker Register

Engineering-controlled blockers: **none open.** Everything below
is customer-owned or externally controlled.

| ID | Blocker | Owner | Unblocks | Status |
|---|---|---|---|---|
| X-01 | GitHub `workflow` scope (CI, Docker cert., branch protection) | Repository owner (Hussein) | First Actions run — everything downstream is prepared | OPEN — single action, ~2 min, see RELEASE_PIPELINE_STATUS.md |
| X-02 | BD-07 + BD-08 decisions | GAEB data owner / business authority | Pilot activation (condition 3) + first import | OPEN — workshop ready |
| X-03 | BD-01…BD-06 decisions | GAEB module owners | Module qualification; BD-04 also blocks Certificates acceptance | OPEN — same workshop |
| X-04 | Pilot charter signature | GAEB sponsor | Conditions 1–2 | OPEN — charter in the activation package |
| X-05 | Extract authorization + first extracts | GAEB sponsor / IBM i team | Condition 5; first real batch | OPEN — intake protocol ready |
| X-06 | Pilot host provisioning | GAEB IT | Conditions 6–7; P0 | OPEN — preflight tool ready |
| X-07 | Named UAT participants | GAEB sponsor | Condition 11; UAT start | OPEN — kit ready |
| X-08 | Independent security review (B-11) | GAEB security | G4 (production) | OPEN — handoff ready |
| X-09 | Screen-reader validation | External reviewer | G4 | OPEN — pack ready |
| X-10 | Alert destination + received test alert | GAEB IT | Condition 9 | OPEN |
| X-11 | Legacy evidence gaps (B-01 PBA3* DDS, B-13 item master, B-03 CHKDIG source) | GAEB IBM i team | Budget/Estimates transforms, tender check-digit | OPEN — modules honest-blocked meanwhile |
| X-12 | Storage/DB fault-injection qualification | Pilot host (dedicated) | Full DR fault coverage | OPEN — procedures written; restart-recovery verified |
