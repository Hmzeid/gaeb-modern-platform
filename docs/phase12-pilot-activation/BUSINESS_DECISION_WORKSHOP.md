# Phase 12 — Business Decision Workshop (BD-01…BD-08)

A one-day, decision-producing workshop. Full per-decision sheets
(evidence, missing evidence, consequences, sign-off blocks) live in
`docs/phase11-controlled-pilot/CUSTOMER_DECISION_WORKBOOK.md`; this
document is the facilitator's running order.

## Ground rules
Every session ends with a recorded decision or a dated deferral
with a named owner. A decision is not closed until its regression
test (BR-xx) is written into the implementation plan. Engineering
recommendations are labeled as such; GAEB decides.

## Priority sessions
### BD-07 — Duplicate handling *(blocks pilot execution)*
Exact question: when an extract contains the same legacy key more
than once, which record is authoritative? Current behavior: first
record loads, later occurrences are quarantined with their raw
bytes preserved and counted as duplicate occurrences in
reconciliation. Options: (a) confirm first-wins; (b) last-wins;
(c) per-file rule set by the data owner. Consequences: the choice
changes lineage (which source offset produced the operational
record), the reconciliation disposition counts, and re-import
behavior — all three are implemented per the decision, then
proven by BR-07 (fixture with known duplicates reconciles under
the chosen rule). Owner: GAEB data owner.
### BD-08 — Historical scope *(blocks pilot execution)*
Exact question: which history migrates — all of it, a cut-off
year, or active records plus summarized history? Consequences:
extract sizes, reconciliation totals, staging volumes, and pilot
duration all derive from this. Engineering recommendation for the
pilot: (c) active + summary, expanding after the first qualified
batch. Owner: GAEB business authority. Proof: BR-08 scope filter
test against DSPFD counts.

## Remaining sessions (30–45 min each)
BD-01 TOT semantics (Real Estate qualification; no engineering
recommendation — compensation definitions are not guessed) ·
BD-02 English names source (recommendation: GAEB translation file
if it exists, else leave empty — never machine-invented) ·
BD-03 authoritative INV001PF definition (whichever matches the
live DSPFFD wins) · BD-04 CUTKND table + worked examples (blocks
customer acceptance of Certificates) · BD-05 CHKDIG algorithm ·
BD-06 CHK5DAYS calendar (recommendation: confirm Fri/Sat weekend
as implemented).

## Facilitator checklist
Pre-reads sent one week ahead (workbook + this guide) · decision
recording sheet per item (decision, owner, date, rationale,
deferral date if any) · scribe captures the exact wording ·
signatures collected same-day for BD-07/BD-08.

## Post-workshop implementation checklist
Encode each decision in the platform where it binds (BD-07 rule,
BD-08 scope filter) · write BR-01…BR-08 regression tests · re-run
full suites · record decisions in the pilot registry (the
`bd_decisions` activation condition is attested against the
signed recording sheet) · update the decision register status.
