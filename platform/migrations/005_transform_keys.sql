-- Idempotency keys for join-based transforms (Phase 2).
ALTER TABLE app.expropriation_cases ADD COLUMN IF NOT EXISTS migration_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_expropriation_migration_key ON app.expropriation_cases (migration_key);
-- app.certificates.legacy_key already exists (migration 001, no constraint) — add the index separately.
CREATE UNIQUE INDEX IF NOT EXISTS ux_certificates_legacy_key ON app.certificates (legacy_key);
