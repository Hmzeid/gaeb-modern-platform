# Phase 13 — Continuous Authorization (Workstream C)

## The decision function
`pilotAuthorization({ datasetKey, fileSha256 })` recomputes
eligibility from **current** state on every customer-data
operation. It is the single decision point for: the buffered
import, the streamed upload/import, the transform of a customer
batch, pilot reactivation, and the UI's authorization preview
(`GET /api/pilots/:id/authorization`).

## What it evaluates, in order
1. An **active** pilot exists (suspended/closed/draft all fail).
2. Expired VERIFIED evidence is materialized to EXPIRED.
3. Every attestation condition holds **VERIFIED, unexpired**
   evidence for *this* pilot (evidence never crosses pilots).
4. Automated conditions pass **live**: environment preflight
   against the actual database; active customer-mode mapping
   approvals.
5. **Dataset binding**: the named dataset is registered to this
   pilot and `authorized`; if an authorized file hash is pinned,
   the presented file's SHA-256 must equal it.
6. The caller's permissions were already enforced by the route
   (`migration.run`); the importing identity is written into the
   audit record of every decision.

## Decision auditing
Every customer import decision — allowed or refused — writes
`pilot.import.authorized` / `pilot.import.refused` with the
dataset, file hash, and the full reasons list. Refusals return
422 with those reasons; nothing about the decision is implicit.

## What "current" buys
A pilot activated last month whose charter evidence was revoked
this morning fails its next import. Approval revocation,
evidence revocation, expiry, suspension, scope change — each
takes effect at the next decision, which is to say at the next
operation. There is no cached eligibility anywhere in the system.
