# Phase 14 — Infrastructure Mobilization for GAEB IT (Workstream F)

## Minimum pilot topology (single host — explicitly NOT production HA)
One host (physical or VM): **4 vCPU · 8 GB RAM · 200 GB SSD** ·
Linux · PostgreSQL **16** · the platform (API + web tier) ·
TLS-terminating reverse proxy · backup target (separate volume
or storage account). Network: the host sits in a GAEB-controlled
segment; inbound 443 only; database port reachable only from
the API tier; no path from the pilot segment to the AS/400
(extracts arrive as files, never as connections).

## Controls checklist (each verified, not asserted)
Authentication & RBAC: individual accounts, roles per the
charter; first administrator created via the platform CLI.
Secrets: injected by the host environment, never in files or
the repository. Backup: daily logical backups + the supplied
tooling; **the restore drill is the control** — a fingerprint-
compared restore must be filed before activation (platform
condition `backup_restore_verified`). Monitoring: host process/
disk/health alerts to a GAEB destination; activation requires a
**received** test alert (`monitoring_alerts_verified`).
Logging: platform audit log (append-only) + host logs retained
per GAEB policy. Access: named users only; no shared accounts.
Qualification: the shipped 16-check environment preflight runs
on the host and its JSON report is filed (condition
`env_preflight` is additionally re-verified live by the server
at every authorization decision). Recovery: restore procedure
in the Operations Handbook (Phase 11 package); point-in-time
recovery requires WAL archiving to be enabled by GAEB IT if
desired for the pilot — the mechanism is verified in the
platform's evidence base.

## Recommended production architecture (for the gap assessment, not the pilot)
Separated database host with synchronous standby + WAL archive
(PITR), redundant application hosts behind the proxy, WORM
export of the audit log, centralized monitoring/SIEM intake,
and a tested multi-host DR plan. The pilot deliberately does
not claim any of this; the Week-3 gap assessment prices and
specifies it against GAEB's requirements (B-11).

**No deployment to GAEB infrastructure occurs without GAEB's
written authorization.**
