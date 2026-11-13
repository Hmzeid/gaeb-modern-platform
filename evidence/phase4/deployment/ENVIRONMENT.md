# Phase 4 Deployment Verification — Environment Manifest

- Date: 2026-11-12
- Host: Muse sandbox VM (Linux, shared 1.5 vCPU), Node v24.22.1, PostgreSQL 16.4 (native execution)
- Docker: NOT AVAILABLE (`docker: command not found`) — the Compose stack could
  not be executed here. Deployment gate status: NOT VERIFIED.
- What was verified instead:
  - docker-compose.yml validated structurally in earlier phases; every compose
    service (PostgreSQL init with all migrations incl. 007, API, frontend build)
    has been executed natively in this environment.
  - scripts/smoke-test.sh (12 checks) is committed and unexecuted — it MUST be
    run on a Docker-capable host; its output becomes the deployment evidence.
  - .github/workflows/deployment-verification.yml runs the same smoke test on a
    Docker-capable GitHub runner and uploads logs as artifacts.
- Database-layer recovery WAS executed for real: see
  evidence/phase4/recovery/restart-recovery-output.txt (PostgreSQL restart with
  batch/quarantine persistence verified identical before/after).
