# GAEB Modern Platform — Customer Pilot Activation Package

*For GAEB management and technical leadership. This package is the
single customer-facing activation document; the detailed
engineering evidence behind it is indexed in §13.*

## 1. Executive pilot summary
GAEB's six AS/400 business systems (building registry, budget,
tenders, payment certificates, estimates, real estate) have a
modern, bilingual replacement platform that is built, tested, and
rehearsed end to end on synthetic data. This package starts the
real thing: a governed pilot on one or two datasets, in a
dedicated pilot environment, under written authorization, with
every migrated record accounted for.

## 2. Objectives and scope
**In:** School Map (PBLBULDG) and Tenders (PBPTNDR) migration
qualification; the operational modules for UAT; reconciliation
evidence per batch. **Out (this pilot):** Budget appropriations
transform (source DDS outstanding), Estimates operational
transform (item master outstanding), production cutover,
historical scope beyond the BD-08 decision.

## 3. Proposed schedule
P0 provisioning (1 wk) → decision workshop (1 day, §5) →
environment qualification (2 days) → first dataset cycle
(2 wks) → UAT (3 wks, parallel) → pilot operation + review (4 wks).

## 4. Pilot charter (for signature)
The full charter text is maintained as the authoritative document
`docs/phase11-controlled-pilot/PILOT_CHARTER.md` — objectives,
environments, roles, entry/exit conditions, change control,
rollback triggers, escalation. Signature block: GAEB Sponsor ·
GAEB IT Lead · GAEB Data Owner · Veebase Delivery Lead (names and
dates intentionally blank).

## 5. Business decisions required
Eight decisions (BD-01…BD-08), detailed in
`BUSINESS_DECISION_WORKSHOP.md`. Two gate the pilot start:
**BD-07 duplicate handling** and **BD-08 historical scope**. The
workshop closes all eight in one day; each decision is recorded
with its owner, rationale, and the regression test that proves
the implementation follows it.

## 6. Required data extracts
Per dataset: the member extract (offline, from a scratch library
restore), its layout/DDS, DSPFD record counts, and a SHA-256
manifest. First pilot datasets: PBLBULDG, PBPTNDR. The platform
never connects to the AS/400.

## 7. Secure data-transfer procedure
The 15-step protocol
(`docs/phase11-controlled-pilot/DATA_INTAKE_PROTOCOL.md`):
written authorization → classification → approved extraction →
encrypted transfer → dual SHA-256 → chain of custody → encrypted
staging → preflight → gated import → reconciliation → customer
review → retention/deletion per policy. Customer data never
enters the demonstration environment and is never sent to any
third-party or AI service.

## 8. Infrastructure requirements
One pilot host: 4 vCPU / 8 GB RAM / 200 GB SSD, PostgreSQL 16,
TLS-terminating proxy, backup storage, a monitored alert
destination. Qualification is automated: the platform ships a
16-check environment preflight that must pass on the host.

## 9. Security and data-handling requirements
Role-based access with separation of duties (an importer cannot
approve their own batch — enforced by the system, demonstrated in
rehearsal); full audit trail; extracts retained only per the
charter schedule. GAEB's independent security review is a
production gate; the handoff package is ready
(`docs/phase10-pilot-package/`, §03).

## 10. UAT participation plan
Named GAEB users per module execute 20 prepared scenarios
(`CUSTOMER_UAT_KIT.md`) in the pilot environment; defects are
logged, severity-triaged, fixed, and retested with recorded
evidence; GAEB records acceptance or exceptions per scenario.

## 11. Acceptance criteria (proposed; binding when GAEB approves)
Record accounting 100% · reconciliation equation exact on every
batch · money control totals exact (decimal arithmetic) · Arabic
fidelity sample 100% · zero imports without an active pilot and
customer-mode approvals · UAT critical path passed.

## 12. Escalation and governance
Weekly pilot board (sponsor, IT lead, data owner, delivery lead);
severity-1 issues escalate same-day to the sponsor; scope changes
only by written change control against the charter.

## 13. Evidence index (engineering, available on request)
Baseline verification · environment preflight tool + results ·
28-check synthetic dry run · reconciliation method · security
qualification · accessibility validation pack · operations
handbook — Phases 10–12 packages in the repository.

## Approval page
Pilot charter approved ☐ · Scope approved ☐ · BD-07/BD-08
recorded ☐ · Extract authorization signed ☐
GAEB Sponsor: __________ Date: ______ · GAEB IT Lead:
__________ Date: ______ · GAEB Data Owner: __________ Date: ______
