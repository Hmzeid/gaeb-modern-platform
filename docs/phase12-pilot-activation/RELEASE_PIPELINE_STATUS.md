# Phase 12 — Release Pipeline Status

## Re-check (2026-11-13, fifth consecutive phase)
GitHub OAuth token scopes, read from the API response headers:
`gist, read:org, repo`. The **`workflow` scope is still absent.**
Per the Phase 12 directive, this is recorded **once**, as a single
owner-controlled blocker — it is not an engineering item and no
further engineering effort is spent on it.

## The exact minimum owner action (any ONE, ~2 minutes)
1. **Re-authorize the Muse GitHub OAuth app** granting the
   `workflow` scope; or
2. **Provide a fine-grained PAT** (Actions + Contents: read/write
   on this repository only) via secure entry, used for a single
   push; or
3. **Upload two files via the GitHub web UI** —
   `ci/ci.yml` → `.github/workflows/ci.yml` and
   `ci/deployment-verification.yml` →
   `.github/workflows/deployment-verification.yml`.

## What happens automatically once that lands (already prepared)
First Actions run executes backend/frontend/E2E/visual suites →
job names fixed from the real run → Docker smoke executes →
branch protection is set on the PR chain → a deliberately failing
PR proves enforcement → evidence filed in the phase package.
Staged workflows (incl. the frontend-tests job) are preserved
under `ci/`; the activation patch is in `evidence/phase6/`.

## Status, stated once
CI execution **BLOCKED** (owner authorization) · Docker
verification **NOT VERIFIED** (no Docker host here; runs in the
same first Actions execution) · branch protection **not
configured** (depends on the two above). Local suites carry the
full verification load meanwhile: 65 backend / 32 frontend /
40 E2E / 31 visual, all green on this phase's head.
