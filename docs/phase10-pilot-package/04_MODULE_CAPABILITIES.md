# 04 — Module Capabilities & Workflows

All six business modules are implemented against the modern
operational schema, bilingual throughout, with workflows enforced
server-side. Status language is precise: "implemented" means the
workflow runs and is test-covered; business *equivalence* with the
legacy system additionally requires the BD decisions (§06) and
real-data qualification (§05).

| Module | Core workflow | Notes |
|---|---|---|
| **School Map** (building registry) | Registry browse/search/filter by governorate; building detail; geographic intelligence (choropleth over the official 27-governorate boundaries) | Server-side pagination validated at 1M records (Phase 9–10). English building names depend on BD-02 |
| **Budget** | Chapter/line allocations, execution tracking, finance reports (role-gated) | Operational transform from legacy budget masters is gated on BD-01/B-01 (missing PBA3* DDS) — the module works; the legacy *mapping* awaits evidence |
| **Purchases & Contracts** | 12-stage tender machine (draft → booklet → published → bids → committees → award → contracted), no stage skipping; server-paged, stage-filterable register | Deadline rule CHK5DAYS pending BD-06; check-digit BD-05 |
| **Technical Abstracts** (payment certificates) | Certificate chain draft → certified → billed → payment-authorized → paid; line items qty × price; typed deductions; certifier ≠ payment authorizer | Net-value equivalence depends on the CUTKND table (BD-04) |
| **Estimates / BOQ** | Estimate drafts, item catalogue, revisions history | Legacy item-master mapping gated on B-13 evidence |
| **Real Estate** (expropriation) | Case register; decree gate (REVM01 → REMV02 only after ministerial decree recorded) | TOT field semantics pending BD-01 |

Cross-cutting: Portfolio Overview (executive aggregates, finance
figures role-gated), Geographic Intelligence, Reports (incl.
buildings-by-governorate, finance CSV exports), Administration
(user directory, approvals console), Migration Center (intake →
preflight → import → reconciliation → approvals → transforms).
