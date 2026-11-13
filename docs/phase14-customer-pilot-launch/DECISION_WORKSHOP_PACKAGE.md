# Phase 14 — Customer Decision Workshop Package (Workstream C)

**Format:** one day, GAEB decision owners + Veebase facilitator
+ scribe. **Output:** a completed decision register, signed in
the room. Full evidence sheets per decision:
`docs/phase11-controlled-pilot/CUSTOMER_DECISION_WORKBOOK.md`.

## Agenda
| Time | Session | Decision | Owner role |
|---|---|---|---|
| 09:00 | Opening: pilot scope + how decisions bind the platform | — | Sponsor |
| 09:30 | **BD-07 Duplicate record policy** | First-wins (current) / last-wins / per-file rule | GAEB data owner |
| 10:30 | **BD-08 Historical migration scope** | Full / cut-off / active + summary (recommended for pilot) | GAEB business authority |
| 11:30 | BD-03 Authoritative INV001PF definition | Whichever matches live DSPFFD | IBM i admin + Abstracts owner |
| 12:15 | BD-04 CUTKND deduction table | GAEB supplies table + worked examples | Abstracts owner |
| 13:30 | BD-06 CHK5DAYS calendar | Confirm Fri/Sat (current) / Sat/Sun / holiday calendar | Purchases owner |
| 14:15 | BD-05 CHKDIG algorithm | GAEB supplies algorithm or program source | Purchases owner |
| 15:00 | BD-02 English building names | Translation file / transliteration table / leave empty | School Map owner |
| 15:45 | BD-01 TOT (REMV01PF) semantics | Compensation / area-value / accumulated payments — **no engineering recommendation; financially sensitive** | Real Estate head |
| 16:30 | Register review + signatures | All | Sponsor |

## Per-decision record (register columns)
Decision ID · exact question · options considered · **decision
taken** · rationale · decision owner (name + role) · date ·
consequences accepted · follow-up regression test (BR-01…BR-08)
· signature. A deferral is recorded with a named owner and a
date — it is a decision about timing, minuted as such.

## How decisions bind the platform (facilitator notes)
BD-07 changes the duplicate disposition in the import engine +
reconciliation counts (BR-07 fixture must reconcile under the
chosen rule). BD-08 sets the extract scope filter + volumes
(BR-08 vs DSPFD counts). BD-03 unblocks the Certificates
transform definition. BD-04 completes deduction valuation.
BD-05/BD-06 complete tender validation rules. BD-02 sets the
name_en population rule. BD-01 defines a compensation figure —
the platform implements exactly what GAEB records, nothing else.
After the workshop, decisions enter the pilot as *evidence*
(independently verified like every other approval) — the
workbook's `bd_decisions` condition is attested against this
signed register.
