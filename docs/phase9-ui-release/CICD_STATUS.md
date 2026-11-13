# Phase 9 — CI/CD Status (Workstream F)

## Permission check (executed first, per directive)
The environment's GitHub OAuth token scopes were read directly from
the API response headers on 2026-11-13:

```
X-OAuth-Scopes: gist, read:org, repo
```

**`workflow` is still absent.** Nothing about the authorization has
changed since the Phase 8 audit. Accordingly, per the directive's
fallback path: no workflow files were pushed, no CI run is claimed,
and local verification carried the full load.

## State of readiness (unchanged, verified present)
- `ci/ci.yml` — backend tests, deployment verification, and (added
  during the UI certification) a `frontend-tests` job: install →
  build → Vitest. The browser E2E and visual-regression steps are
  documented in the file as runner prerequisites (vendored axe-core,
  `CHROME_PATH`) and are not yet encoded as jobs.
- `evidence/phase6/ci-activation.patch` — the activation patch.
- `docs/phase8/GITHUB_CICD_AUDIT.md` and
  `evidence/phase8/branch-protection/OWNER_ACTIONS.md` — the audit
  and the owner checklist.

## Exact owner actions required (any ONE, ~2 minutes)
1. Re-authorize the Muse GitHub OAuth app granting the `workflow`
   scope; **or**
2. Provide a fine-grained PAT (Actions + Contents: read/write) via
   secure entry for a one-time workflow push; **or**
3. Upload `ci/ci.yml` + `deployment-verification.yml` into
   `.github/workflows/` through the GitHub web UI.

Immediately after any of these, the queued sequence is: push
workflows → confirm real job names from the first green run →
trigger deployment verification (includes the Docker smoke test) →
set branch protection → run the deliberately-failing-PR enforcement
proof → publish the run evidence.

## Classifications
- CI execution: **BLOCKED** (owner credential).
- Docker certification: **NOT VERIFIED** (gated by the same
  credential; compose was executed service-by-service natively in
  Phase 8, smoke script ready but unexecuted).
- Branch protection: **NOT CONFIGURED** (same gate).
- Local verification standing in for CI in this phase: backend
  65/65, frontend 32/32, E2E 40/40, visual 31/31 — all executed,
  all reproducible from the commands in `FRONTEND_TEST_REPORT.md`.
