# Accessibility — External Screen-Reader Validation Pack

Status: **PREPARED — NOT EXECUTED.** Screen readers cannot run in
the build sandbox. This pack lets an external reviewer execute the
validation on a workstation and record results that engineering
will accept as the gate evidence. No pass is claimed in advance.

## Automated basis (already executed, Phase 9)
axe-core: **zero violations of any severity on all 11 views**;
heading outline H1 → H2 → H3 verified; landmarks labelled; drawer
focus contract unit-tested (focus-in, Tab trap, Escape, restore).

## Execution matrix
| Tool | Platform | Browser | Passes |
|---|---|---|---|
| NVDA (latest) | Windows 11 | Chrome | Full script below |
| VoiceOver | macOS (current) | Safari | Full script below |
| VoiceOver | iOS (current) | Safari | Core flows 1–3 |

## Script (each flow: complete by screen reader alone)
1. Sign in; announce the page title and landmark structure; list
   headings — the outline must read coherently in order.
2. Navigate by landmarks/links to Purchases & Contracts; create a
   tender; advance it one stage; confirm the toast is announced.
3. Open a record drawer: reading order, close-button label, Escape
   behavior, focus return to the invoking row.
4. School Map: search by an Arabic name with the UI in Arabic;
   confirm results count announcement and pager operability.
5. Migration Center (Arabic): locate the batch status and the
   reconciliation figures by heading/landmark navigation.
6. Portfolio Overview: read the KPI values and the donut's data
   table equivalent (legend) — confirm figures are reachable as
   text, not only as chart geometry.

## Pass criteria
WCAG 2.2 AA for the tested flows: every task completable, every
control named and reachable, focus visible and logical, status
changes announced, no keyboard traps, no content available only
visually. Findings are filed per flow with tool/version, severity,
and the exact step; engineering fixes and re-tests follow the
Phase 9 pattern (regression test first where automatable).

## Record (to be completed by the reviewer)
Reviewer / organization: ______________  Dates: ______________
Environments used: ______________  Result per flow: ______________
Findings filed: ______________  Overall verdict: ______________
