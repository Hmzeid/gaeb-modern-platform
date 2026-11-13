# Phase 9 — Release Gates (Directive §12)

UI gates only. Overall production readiness is a separate judgment
and is **not** made here.

| # | Gate | Verdict | Evidence |
|---|---|---|---|
| 1 | All six documented residuals resolved or explicitly deferred by the owner | **PASS** | `RESIDUAL_CLOSURE.md` — R-C-1…R-C-4, R-A-1, R-A-2 all closed; none deferred |
| 2 | Existing backend tests pass | **PASS** | 65 pass / 0 skipped / 0 fail |
| 3 | Existing frontend tests pass | **PASS** | 32/32 (baseline 27 preserved and extended) |
| 4 | Existing browser tests pass | **PASS** | 40/40 (baseline 25 preserved and extended) |
| 5 | New pagination tests pass | **PASS** | Integration assertions + scale runs at 10k/100k/1M |
| 6 | Visual regression executes | **PASS** | 31/31, deterministic at 0.00% on repeat |
| 7 | No critical/serious accessibility defects in tested scope | **PASS** | axe: zero violations of *any* severity on all 11 views |
| 8 | Arabic and English workflows pass | **PASS** | E2E EN + AR workflows; AR visual baselines |
| 9 | No critical security regressions | **PASS** | `SECURITY_VERIFICATION.md` |
| 10 | School Map handles required synthetic scale | **PASS** | `SCALE_TEST_REPORT.md` (1M records) |
| 11 | Executive dashboards use verified business metrics | **PASS** | Unchanged endpoint contracts; figures traceable; finance gating re-verified |
| 12 | All major routes render correctly | **PASS** | E2E renders all 11 views; executive captures at 4 viewport classes |
| 13 | Migration Center functionality intact | **PASS** | E2E exercises approvals/jobs paths; certification view-parity stands |
| 14 | Screenshots reflect the actual application | **PASS** | `executive-review/` captured from the final build, 0 page errors |
| 15 | Executive review gallery complete | **PASS** | `executive-review/index.html` — 25 captures with EN/AR and device comparisons |

## Gates that remain open outside this phase's scope
- Screen-reader validation (NVDA/VoiceOver): **NOT VERIFIED** —
  external gate, environment limitation, recorded in
  `ACCESSIBILITY_REPORT.md`.
- CI execution / Docker certification / branch protection:
  **BLOCKED** on the owner's GitHub `workflow` scope — `CICD_STATUS.md`.
- Customer business decisions BD-01…BD-08, real-data equivalence,
  UAT, independent security approval, production authorization:
  unchanged from Phase 8 — separate gates, not UI gates.
