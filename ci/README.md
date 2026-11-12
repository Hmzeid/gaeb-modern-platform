# CI workflows — placement pending GitHub token scope

These two workflows are complete and validated as YAML, but the GitHub OAuth
token available to the automation lacks the `workflow` scope, so files under
.github/workflows/ cannot be pushed (remote rejects them). To activate:

1. Grant the token the `workflow` scope (or push from a client that has it).
2. `mkdir -p .github/workflows && cp ci/*.yml .github/workflows/`
3. The deployment-verification workflow is workflow_dispatch-enabled: run it
   once from the Actions tab and file the uploaded artifacts as the deployment
   evidence (docs/release gate matrix, Docker row).

Until then the Docker deployment gate remains NOT VERIFIED — by evidence, not
by intention.
