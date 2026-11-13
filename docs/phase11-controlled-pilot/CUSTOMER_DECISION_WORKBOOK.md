# Phase 11 — Customer Decision Workbook (Workstream B)

Purpose: close BD-01…BD-08 in a GAEB workshop, not by correspondence.
Each decision below is workshop-ready: the exact question, the
evidence in hand, what is missing, the options, engineering's
recommendation where one is defensible, the consequences, and the
validation that follows approval. Source of record:
`docs/validation/GAEB_Business_Decision_Register.md`. **No decision
in this workbook is closed; closure requires the named sign-off.**

## Consolidated decision matrix
| ID | Question (short) | Classification | Owner role | Blocks |
|---|---|---|---|---|
| BD-01 | Meaning of TOT (expropriation) | Blocking module qualification (Real Estate) | Real Estate head | RE transform completeness |
| BD-02 | Source of English building names | Deferrable with explicit approval | School Map owner | EN display completeness |
| BD-03 | Authoritative INV001PF definition | Blocking module qualification (Certificates) | IBM i admin + Technical Abstracts owner | Certificate header mapping |
| BD-04 | CUTKND kinds + formulas | Blocking customer acceptance | Technical Abstracts owner | Certificate NET equivalence |
| BD-05 | CHKDIG algorithm | Blocking module qualification (Tenders) | Purchases owner | Tender-number validation |
| BD-06 | CHK5DAYS calendar | Blocking module qualification (Tenders) | Purchases owner | Deadline authority |
| BD-07 | Duplicate semantics | **Blocking pilot execution** | Data owner | First real import's loaded/quarantined split |
| BD-08 | Historical scope | **Blocking pilot execution** | Business authority | Pilot sizing + sampling plan |

## Decision sheets

### BD-01 — TOT semantics (Real Estate)
- **Process:** expropriation compensation. **Evidence:** the field
  exists in REMV01PF; no delivered program computes compensation
  from it. **Missing:** any worked example tying TOT to a case.
- **Options:** (a) total compensation (b) total area/value
  (c) accumulated payments. **Recommendation:** none — engineering
  will not guess at a compensation definition (financial + legal
  exposure if wrong).
- **Consequences:** until decided, TOT is carried as lineage only;
  compensation figures are not produced. **Migration impact:** the
  field migrates either way; its *meaning* gates reporting.
- **Sign-off:** Real Estate head, written. **Validation:** recompute
  20 sampled cases from legacy listings (BR-01 test).

### BD-02 — English building names (School Map)
- **Evidence:** no English name field exists in PBLBULDG.
  **Missing:** a translation source.
- **Options:** (a) GAEB translation file (b) GAEB-approved
  transliteration table (c) leave empty. **Recommendation:** (a) if
  the file exists, else (c) — an unapproved transliteration in an
  official registry is worse than an honest blank.
- **Consequences:** display completeness only; no financial impact.
  **Classification:** deferrable — the Arabic registry is complete
  without it. **Sign-off:** School Map owner. **Validation:**
  sampled bilingual review (BR-02).

### BD-03 — INV001PF authoritative definition (Certificates)
- **Evidence:** two conflicting DDS copies (BIL02SRC vs NGHADA).
  **Missing:** a live DSPFFD to arbitrate.
- **Options:** adopt one copy; archive the other as historical.
  **Recommendation:** whichever matches the live DSPFFD — evidence
  arbitrates, not preference.
- **Consequences:** settles the certificate-header mapping; a wrong
  pick misaligns every migrated certificate header.
  **Sign-off:** IBM i admin + Technical Abstracts owner, jointly,
  after the field-by-field comparison. **Validation:** BR-03.

### BD-04 — CUTKND deduction kinds and formulas (Certificates)
- **Evidence:** programs branch on the codes; the enumeration was
  never delivered. **Missing:** the table + one worked example each.
- **Options:** this is evidence delivery, not a choice.
  **Recommendation:** n/a.
- **Consequences:** certificate NET is not independently checkable
  until delivered — this is the single largest blocker to financial
  equivalence, and therefore to acceptance of the Certificates
  module. **Financial implication:** deduction errors move real
  payment amounts; the platform records deductions typed and
  auditable in the meantime. **Sign-off:** Technical Abstracts
  owner accepts the delivered table. **Validation:** recompute
  certified abstracts end-to-end (BR-04).

### BD-05 — CHKDIG algorithm (Tenders)
- **Evidence:** legacy field + validation programs; algorithm not
  delivered. **Options:** supply algorithm or program source.
- **Consequences:** tender numbers are accepted unvalidated until
  delivered (flagged in the UI's underlying register, risk B-03).
  **Sign-off:** Purchases owner. **Validation:** known-good /
  known-bad number vectors (BR-05).

### BD-06 — CHK5DAYS calendar (Tenders)
- **Evidence:** a deadline program exists; the rule was inferred
  (5 working days, Fri/Sat weekend) and is flagged UNVERIFIED in
  code. **Options:** (a) confirm Fri/Sat (b) Sat/Sun (c) official
  holiday calendar.
- **Recommendation:** (a) matches observed behavior — but it must be
  *confirmed by GAEB*, because a deadline rule has legal effect on
  tender validity. **Consequences:** until confirmed, deadline
  warnings are advisory. **Sign-off:** Purchases owner, written.
  **Validation:** deadline cases straddling weekends/holidays
  against legacy behavior (BR-06).

### BD-07 — Duplicate semantics (all modules) — PILOT-BLOCKING
- **Evidence:** repeated legacy keys occur in real files (proven in
  the POC corpus). **Current behavior:** first record loads; later
  duplicates are quarantined with raw evidence.
- **Options:** (a) confirm first-wins (b) last-wins (c) per-file
  rule. **Recommendation:** (a) — it never overwrites silently and
  preserves the evidence trail; changing it later is a re-run, not
  a rescue.
- **Consequences:** decides the loaded/quarantined split of the
  very first pilot import — hence pilot-blocking. **Sign-off:**
  Data owner, written. **Validation:** pilot file with known
  duplicates reconciled jointly (BR-07).

### BD-08 — Historical scope — PILOT-BLOCKING
- **Options:** (a) full history (b) cut-off year (c) active records
  + summarized history. **Recommendation:** (c) for the pilot —
  bounds the pilot while keeping full history reachable later.
- **Consequences:** sizes the migration, the equivalence sampling,
  and the pilot timeline. **Sign-off:** Business authority.
  **Validation:** per-year counts from DSPFD agreed before import
  (BR-08).

## Proposed workshop agenda (one day)
09:00 pilot-blocking decisions (BD-07, BD-08) → 10:30 financial
chain (BD-04, BD-03) → 12:00 Real Estate (BD-01) → 13:30 Tenders
(BD-05, BD-06) → 15:00 School Map (BD-02) → 15:30 sign-off capture
and validation-test scheduling. Each session ends with the decision
recorded or an explicit deferral with a named date — not with a
discussion summary.
