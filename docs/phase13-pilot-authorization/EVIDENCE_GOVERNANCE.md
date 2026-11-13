# Phase 13 — Evidence Governance (Workstream A)

Migration 013 adds `app.pilot_evidence`. The Phase 12 attestation
endpoint is **removed** — a typed reference alone no longer
satisfies anything.

## Lifecycle (enforced server-side)
`PENDING → SUBMITTED → VERIFIED / REJECTED`; `VERIFIED → REVOKED`
(reason required) · `VERIFIED → SUPERSEDED` (automatic when a
successor for the same pilot+condition is verified; the new
record links back via `supersedes_id`) · `VERIFIED → EXPIRED`
(materialized lazily at every authorization evaluation when
`expires_at` has passed). Terminal states cannot transition;
every illegal transition is refused with the current state named.
(PENDING is the pre-submission state of an evidence record; a
condition with no verified evidence is likewise pending.)

## Record contents
Pilot, condition, document reference, document type, signatory /
issuing authority (as supplied), effective date, expiration,
creator + submission identity and timestamps, verifier identity
and timestamp, verification decision + notes, revocation reason,
supersession linkage — and the hash fields below. All transitions
write audit rows (`pilot.evidence.*`), including denied
verification attempts.

## Hash honesty (explicit)
`hash_status` is one of: `none` (no hash recorded) ·
`declared-unverified` (a hash typed or supplied by the submitter —
**never presented as verification**) · `verified-bytes` (the
server computed SHA-256 from the actual document bytes presented
via `POST /evidence/:id/document`; the bytes are hashed, measured,
and not retained — retention stays in GAEB's document system).
The platform does **not** cryptographically authenticate GAEB
signatures: no signature-verification trust chain exists in this
system, and none is claimed. Verification here means an
independent authorized human reviewed the referenced document and
recorded that decision under their identity.
