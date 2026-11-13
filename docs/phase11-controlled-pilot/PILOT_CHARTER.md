# GAEB Pilot Charter (Workstream C) — PREPARED FOR CUSTOMER APPROVAL

**Status: DRAFT. This charter is not signed and creates no
obligations until GAEB executes it.**

## Objectives
Prove, on GAEB-controlled infrastructure with GAEB-authorized data,
that the GAEB Modern Platform (1) migrates legacy data with exact
accounting, (2) operates the six business modules bilingually,
and (3) is operable by GAEB's own processes — as the evidentiary
basis for a customer acceptance decision.

## Scope
**Included modules:** School Map, Geographic Intelligence, Budget,
Purchases & Contracts (Tenders), Technical Abstracts
(Certificates), Estimates/BOQ, Real Estate, Reports,
Administration, Migration Center.
**Excluded:** production cutover; full-history migration (unless
BD-08 decides otherwise); any module behavior whose governing BD
decision is still open (such behavior is demonstrated as-is with
its caveat, not accepted); public/external access.

## Environments (kept distinct)
- **Demonstration:** synthetic data only; demos, training, UAT
  dry-runs. Never receives customer extracts.
- **Pilot:** GAEB-approved infrastructure; authorized extracts only
  via the Data Intake Protocol; separately credentialed.
- **Production:** does not exist under this charter. Production is
  a separate authorization after acceptance.

## Participating departments & roles (to be named by GAEB)
Executive sponsor · business owners per module (decision owners
per the Decision Workbook) · IBM i administrator · data owner ·
security reviewer · UAT participants per module · IT operations
lead. Veebase side: platform lead, migration engineer, support
contact. *Names are recorded at signing; this draft asserts none.*

## Responsibilities
- **Data ownership:** GAEB owns all customer data at all times;
  extracts are used solely for the pilot; retention/deletion per
  the approved policy in the Intake Protocol.
- **Hosting ownership:** GAEB IT owns infrastructure, network,
  certificates, backup storage.
- **Security:** GAEB security reviewer owns the independent review
  and approval; Veebase owns remediation of findings in scope.
- **UAT ownership:** GAEB business owners own execution and
  verdicts; Veebase owns defect fixes and re-test support.
- **Technical:** Veebase owns the platform, migration execution,
  and evidence generation; GAEB's IBM i team owns extract
  production on the source side.

## Entry conditions
Charter signed · environments provisioned and preflight-qualified
(ENV checks) · BD-07 and BD-08 decided · extract authorization for
the first dataset signed · UAT participants named · alert
destination verified live.

## Exit conditions
Rehearsal-grade evidence repeated on authorized data: batch
reconciliations meet the approved thresholds · UAT pack executed
with results recorded · defects triaged · pilot review held ·
acceptance form presented for GAEB's decision (signed or declined
— either is a valid exit; a silent pilot is not).

## Acceptance criteria (for the pilot itself)
The criteria in the Reconciliation & Acceptance document (§05
thresholds as approved by GAEB) plus the UAT exit criteria. Nothing
in this charter converts pilot success into production
authorization.

## Change control
Scope, thresholds, or timeline changes require a written amendment
signed by both parties' leads; BD decisions follow the Workbook
process; no verbal scope changes.

## Rollback conditions
Any of: reconciliation failure on a pilot batch that cannot be
explained; a security finding rated critical by GAEB's reviewer;
data-handling deviation. Rollback = stop imports, preserve all
evidence and audit logs, restore the pilot database to the
pre-pilot backup, joint incident review before any restart.

## Escalation
Operator → module business owner → executive sponsor (GAEB) /
platform lead (Veebase) → joint steering session within 2 business
days for pilot-blocking issues.

## Sign-off
GAEB executive sponsor: __________  Date: ______
GAEB IT lead: __________  Date: ______
GAEB data owner: __________  Date: ______
Veebase platform lead: __________  Date: ______
