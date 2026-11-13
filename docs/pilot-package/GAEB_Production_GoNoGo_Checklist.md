# GAEB Production Go/No-Go Checklist

Every box must be checked with evidence, or the answer is NO-GO.
- [ ] Docker deployment certified (12/12 smoke checks on the production-like host)
- [ ] CI enforced on the release branch (required checks configured)
- [ ] Real-data pilot completed and reconciled against GAEB control totals
- [ ] Business decisions BD-01…BD-08 recorded and their regression tests green
- [ ] Business equivalence signed by GAEB business owners
- [ ] Independent security approval granted (GAEB reviewers)
- [ ] Customer UAT executed by named GAEB participants; sign-off signed
- [ ] Backup + PITR verified ON THE PRODUCTION HOST (not only in drills)
- [ ] Alert delivery tested end to end to the operations destination
- [ ] Support arrangement staffed (hours, escalation, contacts)
- [ ] Rollback rehearsed on the production-like host
- [ ] Production authorization signed by the designated authority
