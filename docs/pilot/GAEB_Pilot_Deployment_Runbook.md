# GAEB Pilot Deployment Runbook

1. Provision the pilot host (Environment Requirements). Confirm Docker is
   available; if it is, run `scripts/smoke-test.sh` FIRST and file the output —
   a pilot environment that has not passed the 12-check smoke test is not ready.
2. Deploy the release candidate (Deployment Runbook): compose up, create the
   admin via CLI, create named operator/approver accounts for the pilot
   participants (no shared accounts).
3. Verify role separation live: as the operator, attempt a mapping approval
   (expect 403); as the approver, attempt an import (expect 403).
4. Register the pilot layouts (admin act) from GAEB-confirmed DDS/CCSID
   evidence; record the layout hashes in the pilot evidence register.
5. Confirm backup jobs run: one pg_dump + one base backup before the first
   extract arrives; verify a restore into a scratch database by fingerprint
   comparison (tools in platform/tools/).
6. Confirm the transfer channel with a harmless test file + checksum round
   trip with GAEB's IBM i administrator.
7. Freeze the environment: record commit, image digests, and configuration in
   the pilot evidence register. No changes during the pilot except through
   the issues register.
