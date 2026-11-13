# Phase 14 — Customer Action Register

Every action GAEB (or the repository owner) must take, with its
owner role, the evidence it produces, and what it unblocks.
**Status of every row today: OPEN — none has been performed.**

| # | Action | Owner role | Evidence produced | Unblocks |
|---|---|---|---|---|
| A-01 | Attend executive meeting; fix workshop date | GAEB Sponsor | Meeting record | Workshop |
| A-02 | Decide BD-07 + BD-08 (full register BD-01…08) | Data Owner / Business Authority + module owners | Signed decision register | Activation condition; extract scope |
| A-03 | Sign the pilot charter | Sponsor + Technical + Data Owners | Signed charter → platform evidence | Conditions 1–2 |
| A-04 | Confirm PBLBULDG/PBPTNDR definitions, scope, classification; sign extract authorization | Data Owner + Security Rep + IBM i authority | Signed authorization + DSPFD volumes | Condition 5; dataset authorization |
| A-05 | Provision pilot host per the mobilization package | GAEB IT | Preflight JSON report filed | Conditions 6–7 |
| A-06 | Complete backup restore drill on the host | GAEB IT + Veebase | Filed drill report | Condition 8 |
| A-07 | Configure monitoring; receive a test alert | GAEB IT | Received-alert reference | Condition 9 |
| A-08 | Approve the data-transfer channel | GAEB IT + Security Rep | Channel approval reference | Condition 10 |
| A-09 | Name UAT participants per module | Sponsor | Participants list | Condition 11; UAT start |
| A-10 | Record security prerequisites; commission independent review | Security Representative | Prerequisite record; review engagement | Condition 12; production gate B-11 |
| A-11 | Produce the first extracts with SHA-256 manifest | GAEB IBM i team | Extract files + manifest + custody entry | First migration |
| A-12 | Sign reconciliation packages batch by batch | Data Owner | Signed packages | Acceptance |
| A-13 | Grant the GitHub `workflow` scope (any one of: re-authorize OAuth with the scope · repo-scoped PAT via secure entry · web-UI upload of the two staged files) | Repository owner (Veebase) | First green Actions run | CI, Docker certification, branch protection |
