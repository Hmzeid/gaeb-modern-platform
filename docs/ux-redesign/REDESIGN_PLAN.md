# Screen-by-Screen Redesign Plan

Applies to whichever concept is selected; the shell, system and patterns are
shared — the concepts differ in altitude and emphasis, not in components.

## Shell (all concepts)
Grouped navigation (Executive / Operations / Governance), global search
(buildings, tenders, certificates, legacy codes), approvals badge fed by a
count endpoint, user/role menu, EN/AR toggle with full RTL, light + dark
(Concept A is dark-first; B light-first; C light with a navy executive band).

## Screens

1. **Sign in** — split brand panel + form, SSO-ready layout, inline errors,
   throttling message from the real 429, language toggle pre-login.
2. **Executive Command Center** (A/C) — KPI band, budget execution
   (allocated/certified/paid), portfolio by region, certificate pipeline
   funnel, risk & exceptions, approvals queue, activity feed, migration
   health. Every widget drills to the filtered module view.
3. **Operations Overview** (B/C) — my queues, approvals inbox sorted by SLA
   risk, deadline watch (5-working-day rule), workload by module, today's
   transactions.
4. **School Map** — registry table + governorate distribution + data-quality
   panel + record inspector (lineage, linked tenders/certificates/estimates/
   budget lines).
5. **Budget** — execution by governorate/line with utilization alerts;
   allocations table; drill to certificates paid against a line.
6. **Tenders & Contracts** — filterable pipeline table, deadline column with
   rule state, record drawer with stage stepper and offers summary.
7. **Payment Certificates** — pipeline summary, money-formatted table,
   valuation detail (items × price, typed deductions), transition actions
   honoring separation of duties (buttons disabled *with the reason shown*).
8. **Estimates & BOQ** — catalogue workbench, estimate editor with revision
   history and return-for-correction flow.
9. **Real Estate** — case list with decree-gate timeline, plot/lease facts,
   REMV01 → REMV02 action gated visibly on the decree.
10. **Reports & Analytics** — the three existing report aggregates as real
    dashboards + CSV export (existing endpoints), scheduled-export ready.
11. **Migration Center** — existing function re-skinned: inventory coverage,
    intake pipeline board, jobs, live monitor, approvals, reconciliation
    viewer (three outcomes kept separate), quarantine workbench.
12. **Administration & Governance** — users/roles, audit log viewer,
    approval-policy and system health (health-check integration).

## Data binding — no decorative metrics

| Widget | Source |
|---|---|
| KPI: buildings / tenders / certificates / cases | `GET /api/buildings`, `/api/tenders`, `/api/certificates`, `/api/realestate/cases` (counts) — or one new `GET /api/overview` aggregate (small backend addition, recommended) |
| Budget execution chart | `GET /api/reports/budget-utilization` + certificates summary |
| Portfolio by region | `GET /api/reports/buildings-by-governorate` |
| Certificate pipeline | `GET /api/certificates` grouped by status (or the aggregate) |
| Approvals queue & badge | migration approvals + pending workflow states; one new count endpoint recommended |
| Risk & exceptions | Derived rules over existing data: tender deadlines (CHK5DAYS state), blocked certificates (missing payment ref), quarantine counts from `/api/migration/metrics`, decree-pending cases — each rule named in code, no invented scores |
| Activity feed | `GET /api/audit` |
| Migration health/coverage | `/api/migration/metrics`, `/api/migration/inventory`, `/batches/:id/progress` |
| Deadline watch | tenders + working-day rule (flagged B-04 until GAEB confirms the calendar) |

New backend work is deliberately small: an `/api/overview` aggregate and an
approvals-count endpoint. Everything else exists.

## Phasing (after concept selection)
UX-1 design system + shell + formatters · UX-2 dashboards (executive +
operations) · UX-3 module workspaces (School Map, Tenders, Certificates) ·
UX-4 remaining modules + Reports · UX-5 Migration Center re-skin + Admin ·
UX-6 verification pass (see ACCEPTANCE_CRITERIA.md). Each phase ends with
the full backend suite green and before/after screenshots.
