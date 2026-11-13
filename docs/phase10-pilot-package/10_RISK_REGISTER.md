# 10 — Risk Register (Phase 10 consolidation)

Sources: blocker register B-01…B-13 (`docs/BLOCKERS.md`), residual
risks RR-01…RR-06 (`docs/security/`), and phase-level observations.
Only open items are listed; likelihood/impact are qualitative.

| ID | Risk | L×I | Mitigation in place | Owner of the unblock |
|---|---|---|---|---|
| B-01 | Budget master DDS (PBA3*) never delivered → budget legacy mapping cannot be completed | M×H | Budget module works on manual/modern data; mapping stays gated, not faked | GAEB (evidence) |
| B-02/BD-03 | Conflicting INV001PF definitions | M×M | Transform gated until DSPFFD comparison decides | GAEB IBM i admin |
| B-03/BD-05 | CHKDIG algorithm unknown → tender numbers unvalidatable | M×L | Entry allowed without validation; flagged | GAEB Purchases |
| B-04/BD-06 | CHK5DAYS calendar unverified | M×M | Implemented as Fri/Sat with an UNVERIFIED flag in code + docs | GAEB Purchases |
| B-05 | CCSID-425 content undecodable | L×H | Detection + flagging; no guessing; affected files quarantined visibly | GAEB (identify scope) |
| B-06 | No authorized extracts yet → real-data qualification cannot start | —×H | Full §05 process + rehearsal-proven engine standing by | GAEB sponsor |
| B-08/BD-04 | CUTKND table missing → certificate NET not fully checkable | M×H | Deductions typed + recorded; equivalence caveat explicit | GAEB Technical Abstracts |
| B-11 | No independent security review/approval | M×H | Handoff package prepared (§03) | GAEB security |
| B-12 | No named UAT participants / unsigned criteria | —×H | UAT pack ready (§07) | GAEB sponsor |
| B-13 | Estimates item-master PF unidentified | M×M | Estimates module works; legacy mapping gated | GAEB (evidence) |
| RR-02 | Audit log lacks external WORM export | L×M | Append-only in DB; export design scoped | Joint (production gate) |
| RR-03 | Dependency scanning not running (CI blocked) | M×M | SBOM produced (98 components); scan queued behind CI activation | Repo owner (see §12) |
| RR-06 | Single-host pilot; multi-host DR undefined | L×H | Verified restore path; DR targets are a production gate | GAEB IT |
| P10-1 | Deep OFFSET paging cost if registry browsing becomes a primary high-volume workflow | L×L | Measured + documented (Phase 9); keyset pagination is the scoped remedy | Engineering (future) |
| P10-2 | Screen-reader issues may surface in external validation | L×M | Automated scope is zero-violation; pack prepared for early execution | External reviewer |
