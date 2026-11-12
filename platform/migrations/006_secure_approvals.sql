-- Secure, identity-bound mapping approvals (Directive §3).
ALTER TABLE mig.mapping_approvals ADD COLUMN IF NOT EXISTS approved_by_user_id BIGINT REFERENCES app.users(id);
ALTER TABLE mig.mapping_approvals ADD COLUMN IF NOT EXISTS approved_role TEXT;
ALTER TABLE mig.mapping_approvals ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'customer' CHECK (mode IN ('demo','customer'));
ALTER TABLE mig.mapping_approvals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked'));
ALTER TABLE mig.mapping_approvals ADD COLUMN IF NOT EXISTS revoked_by_user_id BIGINT REFERENCES app.users(id);
ALTER TABLE mig.mapping_approvals ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE mig.mapping_approvals ADD COLUMN IF NOT EXISTS revoke_reason TEXT;
CREATE TABLE IF NOT EXISTS mig.mapping_approval_events (
  id BIGSERIAL PRIMARY KEY, transform_name TEXT NOT NULL, legacy_member TEXT NOT NULL, legacy_field TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('approved','revoked','reapproved')),
  actor_user_id BIGINT, actor_role TEXT, transform_hash TEXT, evidence_ref TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now());
ALTER TABLE mig.batches ADD COLUMN IF NOT EXISTS data_class TEXT NOT NULL DEFAULT 'synthetic' CHECK (data_class IN ('synthetic','customer'));
ALTER TABLE mig.batches ADD COLUMN IF NOT EXISTS imported_by_user_id BIGINT REFERENCES app.users(id);
