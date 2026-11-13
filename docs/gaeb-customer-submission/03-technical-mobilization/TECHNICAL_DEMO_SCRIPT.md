# Phase 14 — Technical Demonstration Script (45–60 minutes)

*For GAEB IT, data, and security reviewers. Live system,
synthetic data, disposable database — reviewers may ask for any
step to be repeated or broken.*

1. **Architecture walk-through** (5 min): the four layers; why
   the migration engine is offline; where each control lives.
2. **Environment preflight** (5 min): run
   `tools/env-preflight.mjs` live against the demo instance —
   16 checks; show a filed JSON report from a previous run.
3. **Migration mechanics** (10 min): build a fixture with the
   review team watching (records incl. a duplicate key and a
   corrupt field) → standalone preflight verdict → import →
   progress endpoint → reconciliation vs an independent recount
   done in the session → quarantine evidence (reason + raw hex).
4. **Approval gates** (5 min): transform with no approvals
   (422) → operator approval attempt (403) → importer
   self-approval (still 422) → independent approval (200) →
   revoke with reason → transform refused again.
5. **Evidence governance** (10 min): create evidence (operator)
   → submit with a declared hash — note the `declared-unverified`
   label → upload document bytes — label becomes
   `verified-bytes` with the server-computed hash → verifier
   attempts self-verification on their own record (422, and the
   denial appears in the audit log) → independent verification →
   supersession by a successor record.
6. **Continuous authorization** (10 min): activate the pilot →
   bound-dataset import succeeds → **revoke one evidence record
   mid-session** → next import refused with reasons → suspend →
   reactivate (fresh evaluation) → streamed import of 3,000
   records with progress → close the pilot → final refusal.
   Fetch the audit export and walk the decision entries.
7. **Recovery evidence** (5 min): the filed backup/restore and
   PITR drill reports; run the fingerprint comparison against
   the demo database.
8. **Known limits, stated by us first** (5 min): CI blocked on
   the owner's workflow scope; Docker not yet certified; no
   independent security review yet (handoff ready); CCSID-425
   content stops by design; the two transforms awaiting GAEB
   source evidence (B-01, B-13).
