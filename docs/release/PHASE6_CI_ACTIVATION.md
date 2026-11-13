# Phase 6 — CI Activation Status

**Status: BLOCKED (unchanged cause, newly measured facts).**
- Token scopes re-verified Phase 6: `gist`, `read:org`, `repo` — no `workflow`.
- New facts from the GitHub API: Actions is ENABLED for the repository
  (allowed_actions: all), and branch `main` is NOT protected (no required
  checks configured). So the moment the workflow files land, CI runs — but
  nothing yet enforces it on merge.
- Activation patch: `evidence/phase6/ci-activation.patch` (adds
  .github/workflows/ci.yml + deployment-verification.yml exactly as staged).
- Owner action (any ONE): (a) apply the patch from a client whose token has
  the `workflow` scope and push; (b) re-issue the automation token with the
  `workflow` scope. Then run the deployment-verification workflow once and
  configure branch protection requiring the CI check.
- No bypass was attempted; the remote's rejection of workflow pushes without
  the scope is the control working as designed.
