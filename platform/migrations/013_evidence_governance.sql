-- Phase 13: pilot authorization integrity — evidence governance,
-- dataset scope binding, pilot suspension.
ALTER TABLE app.pilots DROP CONSTRAINT IF EXISTS pilots_status_check;
ALTER TABLE app.pilots ADD CONSTRAINT pilots_status_check
  CHECK (status IN ('draft', 'active', 'suspended', 'closed'));
ALTER TABLE app.pilots ADD COLUMN IF NOT EXISTS suspended_by_user_id BIGINT;
ALTER TABLE app.pilots ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE app.pilots ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

CREATE TABLE IF NOT EXISTS app.pilot_evidence (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pilot_id BIGINT NOT NULL REFERENCES app.pilots(id),
  condition_key TEXT NOT NULL,
  document_ref TEXT,
  document_type TEXT,
  doc_sha256 TEXT,
  hash_status TEXT NOT NULL DEFAULT 'none'
    CHECK (hash_status IN ('none', 'declared-unverified', 'verified-bytes')),
  signatory TEXT,
  effective_date DATE,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'REVOKED', 'EXPIRED', 'SUPERSEDED')),
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by_user_id BIGINT,
  submitted_at TIMESTAMPTZ,
  verifier_user_id BIGINT,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  revocation_reason TEXT,
  supersedes_id BIGINT REFERENCES app.pilot_evidence(id)
);
CREATE INDEX IF NOT EXISTS idx_evidence_pilot_cond ON app.pilot_evidence (pilot_id, condition_key, status);

CREATE TABLE IF NOT EXISTS app.pilot_datasets (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pilot_id BIGINT NOT NULL REFERENCES app.pilots(id),
  dataset_key TEXT NOT NULL,
  source_system TEXT NOT NULL DEFAULT 'IBM i (AS/400) NEWLIBGAEB',
  extract_ref TEXT,
  source_sha256 TEXT,
  transform_name TEXT,
  status TEXT NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'authorized', 'retired')),
  registered_by_user_id BIGINT NOT NULL,
  authorized_by_user_id BIGINT,
  authorized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pilot_id, dataset_key)
);
