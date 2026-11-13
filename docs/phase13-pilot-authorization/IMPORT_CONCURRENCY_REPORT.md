# Phase 13 — Import Concurrency & Race Policy (Workstream E)

## The policy (explicit, implemented)
**Authorization is evaluated at operation start and re-evaluated
at every durable boundary. The revocation boundary is the last
committed chunk; operational data is gated separately at
transform time.**

- **Buffered import** executes as one transaction-bounded
  operation: the decision is taken immediately before the import
  in the same request, and the import itself is atomic — its
  records are either all staged under a then-valid decision or
  the import is refused. A revocation committed after that
  decision cannot affect the already-atomic import, and is fully
  effective for every later operation.
- **Streamed import** re-evaluates authorization **after every
  committed chunk** (the stream engine's `afterChunk` hook, now
  awaited). On loss, the import aborts with the reason recorded;
  chunks already committed remain **staged only** — staging is
  not operational data — and the batch cannot proceed: the
  transform endpoint re-evaluates authorization for customer
  batches inside its own transaction and refuses. Reconciliation
  therefore always accounts for exactly what is staged.
- **Transforms** are the hard boundary to operational tables, and
  they check authorization *inside* the transform transaction.
- **Concurrent activations** are serialized by an atomic
  conditional update (`… WHERE status='draft'`): exactly one
  request wins; the loser receives 422 (tested).
- **Concurrent imports** under one valid pilot both proceed;
  idempotency (deterministic batch IDs, run ledger, loaded-keys)
  is unchanged, so duplicates cannot double-load (tested since
  Phase 11).

## Tested (integration suite + rehearsal)
Revocation immediately before import · pilot closure before
import · evidence expiry taking effect between operations ·
transformation-approval revocation between activation and
import · import-then-revoke-then-transform refusal · two
concurrent activations (exactly one 200) · two sequential
imports of the same extract (idempotent) · suspension and
reactivation under load of the decision function.

## Honest limit
A revocation that commits *during* a single buffered import's
execution window (sub-second to seconds) is effective from the
next operation, not retroactively within that atomic import —
the same semantics as any transactional system, stated here
rather than papered over. The transform gate ensures no
operational record can be created from that batch once the
revocation lands.
