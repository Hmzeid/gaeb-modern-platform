# Phase 8 Evidence Index

| Area | Artifact | Establishes |
|---|---|---|
| GitHub audit | docs/phase8/GITHUB_CICD_AUDIT.md; evidence/phase8/github-audit/github-facts.txt | Public repo, stacked PRs #1-#5, no workflows anywhere, Actions enabled, 0 runs, no rulesets/protection/environments/secrets |
| CI activation attempts | push rejection message + Contents API 404 (in audit doc) | OAuth token lacks workflow scope; SSH blocked by sandbox egress; 3 owner routes documented |
| Branch protection | evidence/phase8/branch-protection/OWNER_ACTIONS.md | Exact owner sequence incl. enforcement proof, staged |
| Baseline | docs/TEST_LOG_2026-11-12.txt | 65/65 before and after Phase 8 changes |
| Security | evidence/phase8/security/sbom.json (98 components, lockfile hash unchanged); headers verified live | Headers on all responses; SBOM refreshed |
| Live monitoring | E2E progress assertions in the suite; endpoint sampled live (batch mig-978d…: 5/5, 100%, checkpoint 5, keys 4) | Progress API + polling UI work against real data |
| Data intake | evidence/phase8/data-intake/preflight-large.json | Preflight over 29 MB / 500,000 records in 0.19 s; exact count; REVIEW verdict with the no-Arabic finding |
| Performance | evidence/phase8/performance/benchmark-506k.log | 506,209 @ 5,336 rec/s post-changes — no regression vs Phase 7 (5,416) |
| Recovery | evidence/phase8/recovery/ (pg_dump log + dump) | Logical restore PASS re-executed; PITR/physical stand on Phase 7/6 verifications |
