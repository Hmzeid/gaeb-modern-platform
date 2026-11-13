# GAEB Phase 7 Security Assessment (self-assessment — NOT independent approval)

## Executed this phase
- NEW control: login throttling (per ip+username sliding window, 429 after
  10 failures in 10 min; success clears). Finding P7-F1 (brute-force had no
  attempt budget) — severity Medium, CVSS ~5.3 (network, low complexity,
  no privileges) — REMEDIATED and covered by an automated test.
- NEW negative tests (tests/security-negative.test.ts, all passing):
  correlation-id handling, SQL-injection probes (login + path parameters —
  parameterized throughout; injection-shaped ids return empty/404, no
  internals), path-traversal upload ids refused (400/404), throttling.
- SBOM generated from the installed tree (98 components) with lockfile
  SHA-256 recorded; license inventory: MIT 92, ISC 4, BSD-3-Clause 1,
  Apache-2.0 1 — no copyleft in the production dependency set.
- npm audit: STILL unreachable (managed registry policy 403). Not classified
  as passed; the CI workflow's audit step remains the enforcement route
  once CI activates. Finding P7-F2 (dependency CVE visibility gap) —
  severity Low, owner Release eng., status OPEN (external blocker).

## Standing results re-verified (58+7-test suite)
Approval forgery/revocation/stale-hash/mode-separation, RBAC 403 matrix,
upload caps + containment ids, audit append-only events, session revocation.

## Infrastructure notes
TLS at proxy (RR-01 OPEN), WORM audit export (RR-02 OPEN), idle timeout
(RR-05 OPEN). Backup artifacts are access-controlled files; the pilot
checklist requires encrypted storage for customer-data backups (deployment
decision). Independent security approval: NOT STARTED (B-11).
