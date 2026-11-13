# Customer Approval Checklist — Mapped to Enforced Conditions

A signature or a document reference alone satisfies **nothing**
in the platform: each item below becomes effective only as an
evidence record that an independent verifier has marked
VERIFIED (see the evidence lifecycle). This checklist is the
human view of the server-enforced gate.

| # | GAEB provides | Platform condition / external gate | Evidence form |
|---|---|---|---|
| 1 | Signed pilot charter | `charter_approved` | Signed charter document, verified bytes |
| 2 | Approved pilot scope | `scope_approved` | Signed scope page |
| 3 | BD-07 + BD-08 decisions | `bd_decisions` (with the full register) | Signed decision register |
| 4 | Remaining decisions BD-01…06 | Module qualification (not activation-blocking except as scoped) | Signed register rows |
| 5 | First extract authorization | `extract_authorization` + dataset authorization + hash pin | Signed authorization |
| 6 | Approved infrastructure | `environment_approved` + `env_preflight` (auto, live) | IT approval + preflight report |
| 7 | Named business & technical owners | Charter roles + `participants_assigned` | Charter + participants list |
| 8 | Named UAT participants | `participants_assigned` | Participants list per module |
| 9 | Security prerequisites | `security_prerequisites` | Security representative's record |
| 10 | Data transfer approval | `transfer_mechanism_approved` | Channel approval |
| 11 | Reconciliation acceptance thresholds | Charter adoption of the criteria in `04-acceptance-and-governance/` | Charter clause |
| 12 | Pilot activation authorization | All of the above + `backup_restore_verified`, `monitoring_alerts_verified`, `transform_approvals` (auto) | Activation is the server's act once conditions verify |

Status of every row at submission: **NOT PROVIDED — OPEN.**
