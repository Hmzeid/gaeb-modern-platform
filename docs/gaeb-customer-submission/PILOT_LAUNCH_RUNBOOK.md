# Pilot Launch Runbook — The Exact Sequence After GAEB Approves

No step starts before its prerequisite verifies. The pilot
gate (Steps 5–7) is enforced by the server, not by this
document.

| Step | Action | Owner | Prerequisite | Evidence produced | Go/No-Go |
|---|---|---|---|---|---|
| 1 | Provision the pilot host per the mobilization package | GAEB IT | Charter signed | Host record | Host reachable + spec match |
| 2 | Run infrastructure + security preflight (16 checks) | Veebase + GAEB IT | Step 1 | Preflight JSON filed | Zero FAIL |
| 3 | Backup + restore drill; send + receive a test alert | GAEB IT + Veebase | Step 2 | Drill report; received-alert ref | Restore fingerprint match |
| 4 | Create the pilot record; register PBLBULDG + PBPTNDR datasets | Veebase admin (GAEB environment) | Steps 1–3 | Pilot + dataset records | Records match authorizations |
| 5 | Submit charter/scope/BD/extract/environment/participants/security/transfer evidence; **independent verification** by GAEB-side verifiers | GAEB owners + verifiers | Signed documents exist | VERIFIED evidence records | All attestation conditions VERIFIED, unexpired |
| 6 | Record customer-mode transformation approvals (GAEB approver, evidence-bound, not the importer) | GAEB approver | Step 5 | Active approvals (auto-check passes) | `transform_approvals` green |
| 7 | Activate the pilot | Veebase admin | Steps 5–6 + auto checks live | Activation audit entry | Server returns active — it refuses otherwise |
| 8 | Receive the authorized extract via the approved encrypted channel | GAEB IBM i team → Veebase | Step 7 + signed extract authorization | Custody register entry | Channel + personnel match authorization |
| 9 | Verify SHA-256 at receipt against the manifest + dataset pin | Veebase operator | Step 8 | Hash verification record | Exact match — mismatch halts |
| 10 | First controlled migration batch (preflight verdict → tracked import, live progress) | Veebase operator | Steps 7–9 | Batch + job records | Import completes under current authorization |
| 11 | Reconciliation + exception report; transform under the same live authorization | Veebase + GAEB Data Owner | Step 10 | Reconciliation package | Equation exact; totals exact |
| 12 | GAEB review + batch sign-off | GAEB Data Owner | Step 11 | **Signed reconciliation package** | Signed — the program's first success milestone |
| 13 | Begin the UAT sequence (20 scenarios, named testers) | GAEB testers | Step 12 | UAT rows with results | Critical path scheduled |
| 14 | Defect log → fixes under change control → retest → acceptance review (Week 3) | Joint | Step 13 | Defect register; acceptance minutes | Charter thresholds met or exceptions decided |
