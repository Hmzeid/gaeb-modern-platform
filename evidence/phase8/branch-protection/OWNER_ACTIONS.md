# Owner actions to close CI/CD + branch protection (in order)
1. Grant the workflow scope (any route in docs/phase8/GITHUB_CICD_AUDIT.md).
2. Push .github/workflows/{ci.yml,deployment-verification.yml} (patch:
   evidence/phase6/ci-activation.patch) to main or a branch + PR.
3. Wait for the first CI run; note the ACTUAL job names from the run page.
4. Trigger deployment-verification (workflow_dispatch); file its artifacts.
5. Settings -> Branches -> Add rule for main: require PR, require status
   checks (the job names from step 3), block force pushes, require
   conversation resolution.
6. Enforcement proof: open a PR from a throwaway branch with a deliberately
   failing test; confirm GitHub blocks merge; close the PR, delete branch.
