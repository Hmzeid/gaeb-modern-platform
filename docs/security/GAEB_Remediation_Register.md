# GAEB Security Remediation Register

| ID | Finding | Severity | Owner | Action | Status |
|---|---|---|---|---|---|
| R-01 | F-01 TLS at proxy | Medium | Deployment | Terminate TLS at the hosting reverse proxy; HSTS; document in runbook before any non-local deployment | Open — deployment-time |
| R-02 | F-04 dependency scanning | Low | Release eng. | Enable the CI workflow (needs GitHub `workflow` token scope); run npm audit in CI on every PR | Blocked on token scope |
| R-03 | F-02 audit WORM | Medium | Platform | Nightly signed export of app.audit_log + mig approval events to append-only storage | Open — scoped, not built |
| R-04 | F-03 session idle timeout | Low | Platform | Add idle expiry alongside absolute TTL | Open — scoped, not built |
| R-05 | Customer security requirements unknown (B-11) | Gate | GAEB security | Supply hosting/security requirements and perform the authorized review | BLOCKED — external |
