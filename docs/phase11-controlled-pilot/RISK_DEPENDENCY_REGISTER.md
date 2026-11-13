# Phase 11 — Risk & Dependency Register (Workstream N)

Live register for the controlled pilot. Severity/probability are
qualitative; no blocker is downgraded quietly — status changes
require the evidence named in the last column.

| ID | Risk / dependency | Sev | Prob | Owner role | Mitigation | Required decision / evidence | Status |
|---|---|---|---|---|---|---|---|
| N-01 | BD-07 duplicates undecided | High | — | GAEB data owner | First-wins behavior implemented + evidenced | Written decision | OPEN — blocks first import |
| N-02 | BD-08 scope undecided | High | — | GAEB business authority | Options + sizing method ready | Written decision | OPEN — blocks pilot sizing |
| N-03 | BD-04 CUTKND missing | High | — | Technical Abstracts owner | Deductions typed/audited meanwhile | Table + worked examples | OPEN — blocks acceptance |
| N-04 | BD-01/02/03/05/06 open | Med | — | Respective owners | Workbook + workshop agenda ready | Sign-offs per workbook | OPEN |
| N-05 | Missing legacy evidence (B-01 PBA3*, B-13 item master) | Med | Med | GAEB IBM i admin | Modules work; mappings gated honestly | DDS delivery | OPEN |
| N-06 | Extract authorization not granted | High | — | GAEB sponsor | Intake protocol + rehearsal complete | Signed authorization | OPEN — G2/G3 gate |
| N-07 | UAT participants unnamed (B-12) | High | — | GAEB sponsor | 20-scenario sheet ready | Named participants | OPEN — G3 gate |
| N-08 | Independent security review (B-11) | High | — | GAEB security | Handoff package ready | Review + approval | OPEN — G4 gate |
| N-09 | Hosting approval / pilot infra | Med | — | GAEB IT | Preflight tool + sizing ready | Provisioned host + P0 evidence | OPEN — G2 gate |
| N-10 | GitHub workflow scope | Med | — | Repository owner | Workflows staged; local suites carry the load | Scope grant (2 min) | OPEN — CI/Docker/protection blocked |
| N-11 | Screen-reader validation | Med | Low | External reviewer | Ready-to-run pack | Executed record | OPEN — G4 gate |
| N-12 | Alert delivery unverified | Med | Low | GAEB IT + Veebase | Entry-condition test defined | Received test alert | OPEN — pilot entry |
| N-13 | Real-data reconciliation surprises (encodings, duplicates at scale) | Med | Med | Migration engineer | Preflight + quarantine + equation gates; CCSID-425 flagging | First-batch evidence | OPEN — inherent, managed |
| N-14 | Production authorization | High | — | GAEB executive | Four-gate discipline maintained | Formal go-live decision | NOT STARTED — by design |
