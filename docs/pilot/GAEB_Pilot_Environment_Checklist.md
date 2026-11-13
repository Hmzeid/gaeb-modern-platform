# GAEB Pilot Environment Checklist (all boxes must be checked with evidence)

- [ ] Host provisioned per Environment Requirements; sizing recorded
- [ ] Docker smoke test executed on THIS host; output filed (12/12)
- [ ] TLS terminated at proxy; certificate valid for the pilot hostname
- [ ] Admin created via CLI; no seeded/default accounts exist
- [ ] Named operator + approver accounts created; role-separation probes pass (403/403)
- [ ] Layouts registered from GAEB evidence; hashes recorded
- [ ] pg_dump + base backup taken pre-pilot; restore fingerprint check passed
- [ ] Transfer channel test round trip completed with GAEB IBM i admin
- [ ] Upload cap and disk alerts configured
- [ ] Commit + image digests + config frozen in the evidence register
- [ ] Data classification + retention instruction received in writing from GAEB
- [ ] Named contacts exchanged (GAEB technical, GAEB business, Veebase delivery)
