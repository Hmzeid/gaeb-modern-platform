# Phase 11 — CI/CD & Release Governance (Workstream K)

## Authorization re-check (2026-11-13, this phase)
GitHub OAuth token scopes read from the API response headers:
`gist, read:org, repo` — **`workflow` is still absent** (fourth
consecutive phase). Per the directive: no bypass attempted, CI is
not represented as passing, and the staged configuration is
preserved (`ci/ci.yml` incl. the frontend-tests job,
`ci/deployment-verification.yml`, activation patch in
`evidence/phase6/`).

## Exact owner remediation (any ONE, ~2 minutes)
1. Re-authorize the Muse GitHub OAuth app granting `workflow`; or
2. Provide a fine-grained PAT (Actions + Contents read/write) via
   secure entry for a one-time push; or
3. Upload the two workflow files into `.github/workflows/` via the
   GitHub web UI.
On completion the queued sequence runs: push → first green run
fixes the real job names → deployment verification (incl. Docker
smoke) → branch protection on the PR chain → a deliberately
failing PR proves enforcement → evidence filed.

## Release governance (applies with or without CI)
- **Versioning:** phase branches + PR chain (#1…#10) are the
  release record; a pilot release is tagged `pilot-<date>` from an
  accepted phase head.
- **Change approval:** merges require the repository owner's
  approval; no stacked PR is merged without explicit instruction
  (standing rule).
- **Deployment checklist:** env-preflight JSON filed → migrations
  applied in order → smoke verification → first-admin creation →
  health + one read per module.
- **Rollback:** Operations Handbook procedure (pre-rollback backup
  → previous tag → database restore; migrations are forward-only).
- **Release notes:** each phase's PR body + MILESTONE_REPORT
  addendum constitute the notes; evidence is retained in the
  phase `evidence/` directories and never rewritten after the fact.
