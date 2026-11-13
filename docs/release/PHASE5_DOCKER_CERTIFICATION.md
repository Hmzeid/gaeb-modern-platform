# Phase 5 — Docker Certification Status

**Status: NOT VERIFIED (unchanged from Phase 4).**

Facts, not intentions:
- Docker is not installed in the development sandbox (`docker: command not found`),
  so the Compose stack and the 12-check smoke test cannot execute here.
- The GitHub token available to the automation has scopes `gist, read:org, repo`
  — confirmed in Phase 5 — and NOT `workflow`, so the deployment-verification
  workflow still cannot be pushed to `.github/workflows/` (the remote rejects
  it) and cannot be triggered.
- The workflows remain in `ci/`, validated and ready; activation is a
  one-command copy once a client with the `workflow` scope pushes them
  (ci/README.md).

What IS verified at the deployment layer in Phase 5:
- Every compose service's workload executed natively (API, frontend build,
  PostgreSQL with all migrations through 009).
- PostgreSQL restart recovery: PASS (Phase 4 evidence).
- Logical backup/restore of the full evidence chain: PASS (Phase 5,
  evidence/phase5/recovery/).
- The complete pilot procedure executed against the real API (synthetic
  rehearsal, evidence/phase5/pilot-rehearsal.log).

Certification requires one executed smoke-test run on a Docker-capable host
with all 12 checks passing. Nothing in this document substitutes for it.
