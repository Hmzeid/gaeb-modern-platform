# Phase 14 — Responsibility & Delivery Governance Matrix (Workstream K)

| Domain | Veebase engineering | Veebase implementation | GAEB infrastructure | GAEB business | GAEB data ownership | GAEB UAT/acceptance | Independent reviewer |
|---|---|---|---|---|---|---|---|
| Platform code & fixes | **Owns** | Supports | — | — | — | Reports defects | — |
| Pilot environment build | Advises | **Executes with GAEB IT** | **Owns host/network** | — | — | — | — |
| Business decisions BD-01…08 | Provides evidence + options | Implements decided rules + tests | — | **Owns & signs** | Advises on BD-07/08 | — | — |
| Extract production | Specifies formats | Receives + verifies hashes | IBM i access | Authorizes | **Owns extraction** | — | — |
| Migration execution | Tooling owner | **Operates imports** | Host availability | — | Reviews quarantine | Signs reconciliation | — |
| UAT | Fixes defects | Supports sessions | Accounts/access | Names testers | — | **Owns execution + sign-off** | — |
| Security review | Provides handoff + evidence | Remediates findings | Host hardening | — | — | Accepts risk decisions | **Owns the review** |
| Acceptance | Provides evidence packages | Presents results | — | **Decides** | Signs batches | Signs modules | — |

**Dependencies & deadlines:** workshop before Week 0 ·
charter + extract authorization before activation · host +
preflight before intake · BD-03/BD-04 before Certificates UAT
sign-off · security review before any production decision.
**Escalation:** delivery lead → pilot board (weekly) → Sponsor
(same-day for S1). *No prices, warranties, service levels, or
contractual commitments are stated or implied by this matrix.*
