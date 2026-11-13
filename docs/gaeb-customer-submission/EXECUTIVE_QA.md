# Executive Q&A — Anticipated Questions, Grounded Answers

**"Is this production-ready?"** No — and we will not say
otherwise. Engineering is verified; customer acceptance has not
started; production requires GAEB's security review and
authorization. The pilot exists to earn those, with evidence.

**"Has any of our data been used?"** None. Every demonstration
and test ran on synthetic data; the platform technically
refuses customer data without an active, evidence-verified
pilot — you can watch it refuse in the demo.

**"How do we know Arabic records survive intact?"** Decoding is
field-level with the original bytes preserved on every record;
normalization is search-only and never overwrites. The pilot
measures it: a jointly drawn sample must match the originals
character-for-character before the batch is signed off.

**"What happens to records that fail?"** They are quarantined
with a reason and their raw bytes — counted, visible, and
decided by your data owner. The equation source = loaded +
quarantined must hold exactly, or the batch does not sign.

**"Who can approve what?"** Separation of duties is enforced by
the server: a certificate's certifier cannot authorize its
payment; whoever submits an approval's evidence can never
verify it themselves. Every decision lands in an append-only
audit log.

**"Can an approval be withdrawn later?"** Yes — and withdrawal
takes effect at the next operation, not at some future review.
Eligibility is recomputed live for every import and transform.

**"What do you need from us, concretely?"** The charter
signature, one workshop day, the extract authorization, one
host, named participants, and batch-by-batch reconciliation
sign-off. The Customer Actions document lists all 13 items
with owners.

**"What are the platform's limits today?"** Two module
transforms await source definitions only GAEB can supply
(budget masters, estimates item master); CCSID-425 content
stops for a decision; the pilot host is single-node by design.
All are in the Known Limitations document in this package.

**"What does the pilot prove — and not prove?"** It proves
migration integrity, Arabic fidelity, reconciliation, and
business fit on two real datasets under GAEB's own sign-off.
It does not by itself authorize production; Week 3 delivers
the gap assessment for that decision.

**"Why should we trust the test numbers?"** Each figure in the
Verified Results summary points to the executed evidence in
the repository — suites, rehearsal JSON, restore fingerprints.
Your technical team can re-run any of it.
