# GAEB Monitoring and Alerting Guide

Telemetry that exists today:
- GET /health — liveness (used by the smoke test and load balancers).
- GET /api/migration/metrics — live operational state from the database:
  batches, loaded/quarantined totals, indexed keys, active approvals,
  intake stages, job states, last batch time. Rendered in the Migration
  Center Operations strip.
- x-request-id correlation: every request carries/propagates an id, echoed
  in the response header (Phase 7).
- platform/tools/health-check.mjs — executable checks (DB reachable, no
  FAILED jobs, no stalled leases, 24h quarantine ratio < 20%, DB size vs
  budget, API health). Exit code 0/1 with a JSON report; verified in both
  directions in Phase 7 (evidence/phase7/observability/).

Alert rules (wire health-check + metrics to the destination of choice):
- API or DB unreachable → page.
- Any FAILED import job → ticket same day.
- Job lease expired while RUNNING (stalled worker) → ticket.
- 24h quarantine ratio ≥ 20% → data-quality review before more imports.
- DB size ≥ 85% of budget → capacity ticket.
- Nightly backup missing/failed → page (check on the host's scheduler).

Honest status: alert DELIVERY to a real destination has not been tested
(no destination exists in the development environment). The checks and
thresholds are executable and tested; the wiring is a deployment task on
the pilot host.
