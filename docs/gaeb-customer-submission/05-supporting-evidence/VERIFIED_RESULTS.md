# Verified Engineering Results — Summary with Evidence Pointers

Every figure below was produced by an executed run; the full
evidence lives in the project repository under the phase
packages named. Nothing here is estimated.

| Result | Value | Evidence |
|---|---|---|
| Backend integration suite | **65/65 passing, 0 skipped** | Phase 13 baseline + attack matrix (`docs/phase13-pilot-authorization/`) |
| Frontend unit suite | **32/32** | Phase 9–13 packages |
| Browser E2E (incl. axe accessibility: zero violations, 11 views) | **40/40** | Phase 9–13 packages |
| Visual regression | **31/31** (0.5% threshold, baselines human-reviewed) | Phase 9–13 packages |
| End-to-end synthetic pilot rehearsal | **34/34** | `evidence-rehearsal.json` (Phase 13) |
| Synthetic scale | 2,024,836 records @ 4,533 rec/s (sandbox floor, not an SLA) | Phase 7 package |
| UI query scale | 1,000,000 synthetic buildings, paged | Phase 9 package |
| Backup verification | Logical restore 18/18 tables fingerprint-match; physical base-backup restore match; **PITR verified** | Phase 6–7 packages |
| Legacy analysis | 502 objects inventoried; 1,068 fields in the mapping register | `migration/reconciled/` |
| Migration rehearsal integrity | source = loaded + quarantined on every rehearsed batch | Phase 11/13 evidence JSON |

Qualifications that remain open are listed without softening
in `SECURITY_AND_RELEASE_STATUS.md` and
`KNOWN_LIMITATIONS.md` in this folder.
