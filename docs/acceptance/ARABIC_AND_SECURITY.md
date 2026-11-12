# Arabic Conversion Validation & Security Summary — 2026-11-12

## Arabic
- Table-driven decoders for IBM420, IBM864 (presentation forms unshaped), and
  Windows-1256, generated from glibc charmaps; IBM425 throws explicitly (no verified
  table) rather than silently mis-decoding
- Proven in the E2E run: مدرسة النيل الابتدائية and مدرسة النصر الابتدائية decode from
  IBM420 bytes into staging, through the transform, into app.buildings, and out
  through the API unchanged; delimited-import test decodes Windows-1256 Arabic
- Originals are never overwritten: staging keeps _raw_hex of every record; search
  normalization is a separate derived value
- Live-system CCSIDs are still unverified (B-05): GAEB must confirm per-file/field
  CCSIDs (Data Request Pack §4) before any real Arabic data is trusted

## Security
- Passwords: scrypt (explicit maxmem); no seeded users; first admin via CLI only
- Sessions: opaque tokens, SHA-256 at rest, revocable, 8h TTL
- RBAC with separation of duties; report-level authorization enforced
  (technical role receives 403 on finance CSV, budget role 200 — asserted live)
- Migration Center requires the migration.run grant (technical/admin); budget role
  receives 403 (verified live)
- Mapping approvals are authenticated DB records (approver, timestamp, evidence ref,
  definition hash); a changed transform definition invalidates prior approvals
- Audit log records logins, imports, transforms, and reject resubmissions
- NOT done: no penetration test, no customer security review, no SOC evidence —
  security APPROVAL remains an open gate (B-11)
