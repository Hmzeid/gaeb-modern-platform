# GAEB Pilot Environment Requirements

Four environments, strictly separated. **Customer data may exist only in the
pilot and production environments** — never in development or the synthetic
demonstration environment, and the two never share a database.

| | Development | Synthetic demo | Customer pilot | Production |
|---|---|---|---|---|
| Data | fixtures | synthetic, labeled | REAL GAEB extracts | migrated production data |
| Users | developers | demo accounts | named GAEB + Veebase staff | per GAEB policy |
| Approvals mode | demo | demo | **customer** | customer |
| Backups | none | none | daily pg_dump + base backup | per GAEB policy |

## Pilot environment specification
- Host: one application VM (2 vCPU / 8 GB is ample at measured rates — a
  1M-record import ran at ~4,900 rec/s on a shared 1.5 vCPU sandbox; treat
  that as a floor observed on weaker hardware, not a guarantee) + PostgreSQL
  16 with storage sized at 3× the extract volume.
- TLS terminated at a reverse proxy in front of the API/frontend (R-01).
- Network: inbound only from GAEB's agreed addresses; outbound none required.
- Secrets: injected by the host's mechanism; none in the repository.
- Intake: extracts arrive via the Transfer Protocol channel onto access-
  controlled storage; upload cap configured (MIG_MAX_UPLOAD_MB).
- Audit: application audit log + approval events retained for the pilot's
  full duration; nightly logical backup (pg_dump) + weekly base backup.
- Retention/deletion: per the Data Transfer Protocol — raw extracts deleted
  or returned at pilot end on GAEB's written instruction, confirmed in writing.
- Monitoring: API /health, Migration Center metrics (batches, quarantine,
  intake stages, jobs), disk-growth watch on the staging schemas.
