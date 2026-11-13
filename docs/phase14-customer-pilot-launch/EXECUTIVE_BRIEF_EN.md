# GAEB Modern Platform
## Executive Brief for the Customer Pilot — For GAEB Leadership

*Prepared by Veebase. A decision document, not marketing.
Every figure in it is verifiable from engineering evidence held
in the project repository.*

---

### 1. Executive overview
Veebase has built a modern, bilingual (Arabic-first) platform
replacing GAEB's six IBM i (AS/400) V6R1 business systems:
building registry & School Map, budget, tenders & contracts,
payment certificates, estimates & BOQ, and real estate /
expropriation. The platform is fully built, extensively
automated-tested, and rehearsed end to end on synthetic data.
We now invite GAEB to a governed pilot on its own data — under
written authorizations, with an authorization regime the system
itself enforces technically. We are not asking for a production
decision, and we claim no acceptance that has not happened: we
propose to begin joint, evidence-based validation.

### 2. Current modernization challenges
The legacy estate is live and trusted, but it runs an
out-of-support release, in languages and skills that are
disappearing, with Arabic data held in multiple legacy
codepages and business rules that exist only inside program
behavior. Our source analysis documented 502 legacy program
and file objects, 1,068 fields in the mapping register, and
six subsystems joined by one money path (estimate →
certificate certification → budget payment). The real risk in
migration is not writing new code — it is losing meaning: an
Arabic record read in the wrong codepage, an undocumented
deduction rule, a file definition that conflicts between two
copies.

### 3. Proposed solution
A platform fully independent of outside infrastructure: a
bilingual web tier, an API with role-based governance, a
PostgreSQL database, and a migration engine that is **offline
by design** — it never connects to, and never writes to, the
AS/400; extracts arrive as hash-verified files through a
controlled transfer procedure. Each of the six modules runs a
complete workflow, not data-entry screens: a 12-stage tender
machine that cannot skip stages, separation of duties so a
certificate's certifier cannot authorize its payment, and a
ministerial-decree gate on expropriation cases.

### 4. Platform architecture
Four layers: presentation (Arabic/English, full RTL) → API
(revocable sessions, role permissions, login throttling,
strict security headers) → data (PostgreSQL; exact decimal
money, no silent rounding anywhere) → migration (staging that
carries every record with its lineage and original bytes).
Diagrams are in the Phase 10 package; recovery is evidenced at
three levels — logical restore, physical base-backup restore,
and point-in-time recovery.

### 5. Application modules
School Map & building registry (server-side search/pagination
validated at one million synthetic records) · Budget (money
visible only to finance-report holders) · Tenders & contracts
(full lifecycle with stage history) · Certificates (exact
valuation: quantity × price less typed deductions) ·
Estimates (revisions with history) · Real Estate (decree-bound
cases) · Reports & Analytics · Migration Center ·
Administration & audit trail.

### 6. Executive Command Center
The Portfolio Overview shows figures computed live from
platform data — no hand-typed numbers, no decorative
dashboards: buildings and investment totals, tenders by stage,
budget execution, and the action queues that need decisions.
Users without the finance permission do not see money at all.

### 7. Geographic Intelligence
An interactive map on official 27-governorate boundaries
(OCHA COD-AB data, CC BY-IGO) joining GAEB's legacy codes to
international P-codes — with one documented manual mapping
(Luxor) — and honest coverage reporting: which governorates
hold migrated buildings and which do not, yet.

### 8. Arabic-first workflows
Arabic is not a translation layer here: field-level decoding
across IBM 420/864 and Windows-1256 tables (with an explicit
stop on unsupported CCSID 425 rather than a guess), originals
preserved without silent normalization, search over the
original Arabic text, and a fully RTL interface whose two
dictionaries are kept in tested parity (350+ keys per language).

### 9. Migration and data preservation
A 15-step controlled sequence: written authorization →
classification → approved extraction on GAEB's IBM i →
encrypted transfer → SHA-256 at source and receipt → chain of
custody → encrypted staging → encoding/schema preflight →
tracked import → reconciliation → customer review →
retention/deletion per approved policy. The invariant:
**source = loaded + quarantined**; every quarantined record
carries its reason and its raw bytes; nothing is silently
dropped. Customer data never enters the demonstration
environment and is never sent to any external or AI service.

### 10. Reconciliation and auditability
Each batch ships a reconciliation package for the data owner's
signature: source/parsed/loaded/quarantined counts, duplicate
dispositions itemized, exact-decimal financial control totals
end to end. The audit log is append-only: every privileged
action — approval, revocation, transform, import,
authorization decision — is recorded with user and timestamp.

### 11. Security and authorization governance
The platform's strongest section, built over three dedicated
phases. **Governed evidence**: every required approval is an
evidence record with a lifecycle (PENDING → SUBMITTED →
VERIFIED/REJECTED → REVOKED/EXPIRED/SUPERSEDED).
**Separation of duties**: a submitter can never verify their
own evidence, at any role; denied attempts are logged.
**Continuous authorization**: eligibility for customer-data
operations is recomputed from current state at every operation
— a revocation or expiry stops work at the next operation, not
the next activation. **Scope binding**: every import is bound
to an authorized dataset and to the authorized file's hash; a
substituted file is refused. And unless a pilot is *active*
with all 12 mandatory conditions satisfied, the platform
refuses customer data outright — technically, not procedurally.

### 12. Pilot objectives
(1) Qualify the first two real datasets (PBLBULDG, PBPTNDR)
through migration and reconciliation. (2) Close the eight
business decisions on documented evidence. (3) Execute the
20-scenario customer UAT. (4) Produce an evidence-based
production-readiness gap report. The pilot is neither final
acceptance nor production authorization.

### 13. Customer responsibilities
Sign the charter · close the decisions (one-day workshop) ·
sign the extract authorization · provide the pilot host ·
name UAT participants · run the independent security review
(a production gate) · sign off reconciliation packages batch
by batch. Detail in the accompanying Responsibility Matrix and
Customer Action Register.

### 14. Proposed timeline
A provisioning week (automated host qualification, restore
drill, alert test, accounts), then a three-week execution
window: Week 1 controlled intake and first migration; Week 2
business validation and UAT; Week 3 acceptance, closure, and
the production-gap assessment. Day-by-day in the Three-Week
Pilot Plan.

### 15. Success criteria
100% record accounting per batch · exact reconciliation
equation · exact decimal money totals · 100% on the agreed
Arabic-fidelity sample · zero imports without an active
authorization · UAT critical path passed · every exception
closed by a recorded decision. These criteria are Veebase's
proposal; they become binding only when GAEB adopts them.

### 16. Decisions and approvals required
Eight business decisions (BD-01…BD-08) — two gate the start:
duplicate-record policy and historical scope. Five approvals:
charter, scope, extract authorization, environment, named
participants. A one-day workshop is designed to close all of
them, with a decision register signable in the room.

### 17. Next steps
A 30-minute executive meeting to see the live platform and fix
the workshop date · the decision workshop · charter and
authorization signatures · provisioning week · first
controlled migration. Sent with this brief: the executive
presentation, the decision workshop package, the final
charter, the first extract authorization, and the three-week
plan.
