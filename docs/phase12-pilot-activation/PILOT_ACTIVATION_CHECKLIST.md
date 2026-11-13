# Phase 12 — Pilot Activation Checklist

**This checklist is now enforced by the platform, not by
convention.** Migration 012 + the pilot registry implement it:
a pilot exists as a record with 12 mandatory conditions, and
**customer-class imports are refused by the server (HTTP 422)
unless a pilot is in `active` status.** Activation itself
re-verifies the automated conditions live at the moment of
activation; attestation conditions require an administrator to
record an evidence reference — the API rejects an attestation
without one (400). There is no checkbox path.

| # | Condition (directive §5) | Kind | How it is satisfied |
|---|---|---|---|
| 1 | Pilot charter approved | Attestation | Evidence ref = signed charter document reference |
| 2 | Pilot scope approved | Attestation | Signed scope page reference |
| 3 | BD-07 and BD-08 resolved | Attestation | Signed decision recording sheet reference |
| 4 | Relevant transformations approved | **Automated** | Server checks live: ≥1 active customer-mode rows in `mig.mapping_approvals` |
| 5 | Extract authorization obtained | Attestation | Signed authorization reference |
| 6 | Customer pilot environment approved | Attestation | GAEB IT approval reference |
| 7 | Environment preflight passed | **Automated** | Server checks live: PostgreSQL 16, pg_trgm available, 3/3 trigram indexes, migration schema complete (the standalone 16-check preflight report is filed as supporting evidence) |
| 8 | Backup and restore verified | Attestation | Filed drill report reference (fingerprint comparison) |
| 9 | Monitoring and alert delivery verified | Attestation | Received test-alert reference at the named destination |
| 10 | Data-transfer mechanism approved | Attestation | Approved channel reference |
| 11 | Customer participants assigned | Attestation | Named-participants list reference |
| 12 | Security prerequisites satisfied | Attestation | GAEB security prerequisite reference |

## Verification evidence (executed, Phase 12)
Integration suite: refusal with no pilot · activation refusal
listing ≥10 missing conditions · attestation-without-evidence
400 · non-admin attestation 403 · auto-verify failure before
customer approvals exist, success after · full activation ·
import proceeds · closure re-locks imports. Synthetic dry run
R-15…R-19 repeats the same sequence through the public APIs on a
disposable database: 28/28 overall.

## What remains manual — honestly
Attestations are recorded evidence references, verified by the
pilot board against the underlying signed documents; the system
enforces their *presence and recording*, not the truth of the
paper they point to. That is the correct boundary: the platform
cannot forge or validate a GAEB signature, and it does not
pretend to.
