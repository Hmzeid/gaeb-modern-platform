# Phase 5 — CI Activation

**Status: BLOCKED — missing GitHub `workflow` token scope (verified Phase 5:
token scopes are `gist`, `read:org`, `repo`).**

## Minimal activation (repository owner, ~2 minutes)
1. Re-issue or extend the GitHub OAuth/PAT used by the automation with the
   `workflow` scope (GitHub Settings → Developer settings → token scopes), OR
   perform step 2 from any client that already has it.
2. `mkdir -p .github/workflows && cp ci/ci.yml ci/deployment-verification.yml .github/workflows/ && git add .github && git commit -m "Activate CI workflows" && git push`
3. Confirm the CI workflow runs on the next push: it provisions PostgreSQL 16,
   runs the full suite with TEST_DATABASE_URL set (integration cannot silently
   skip — the job greps for the E2E test name), checks schema determinism, and
   runs the secret scan.
4. Run the deployment-verification workflow once from the Actions tab
   (workflow_dispatch) and file its artifacts as the Docker evidence.

## What is NOT claimed
Branch protection has not been verified through GitHub and is not claimed.
CI enforcement stays BLOCKED until step 3 is observed green.
