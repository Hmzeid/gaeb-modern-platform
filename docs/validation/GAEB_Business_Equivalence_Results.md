# GAEB Business Equivalence — Results

**Overall status: NOT VERIFIED.** No module has been compared against
authoritative legacy outputs, because no GAEB extracts or legacy result sets
have been received. This document records what HAS been established and the
exact decisions still owed by GAEB business owners.

## Established by execution (synthetic fixtures only)
- School Map: mapping mechanism, Arabic preservation, referential join to
  villages — mechanism verified; equivalence of real records unproven.
- Tenders / expropriation / certificate headers: transformation mechanisms
  verified on fixtures (see the Equivalence Matrix for per-module detail).
- Financial arithmetic: exact decimal end to end; certificate valuation is
  quantity × price with typed deductions in the workflow layer.

## Decisions owed by GAEB business owners (blocking equivalence)
1. TOT (REMV01PF) meaning — currently deliberately unmapped (EX-02).
2. English building names — supplied, transliterated, or left empty (EX-01).
3. INV001PF authoritative definition (B-02) — settles the certificate mapping.
4. CUTKND enumeration + formulas (B-08) — settles certificate NET equivalence.
5. CHKDIG algorithm (B-03) and CHK5DAYS calendar rule (B-04).
6. Duplicate semantics for any real file whose legacy key repeats in
   production data: first-wins (current platform behaviour, evidence
   preserved) or a customer-defined rule.
7. Historical-record scope: full history vs a cut-off the business sets.

Each decision, once given, is recorded against the mapping approvals and the
equivalence matrix before the affected transform is re-run.
