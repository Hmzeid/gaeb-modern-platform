-- Phase 12: governed pilot registry + activation conditions.
-- A pilot may become active only when every mandatory condition is
-- satisfied: automated conditions are verified live by the server,
-- attestation conditions require a recorded evidence reference from
-- an administrator (never a bare checkbox). Customer-data imports
-- are refused unless an active pilot exists.
CREATE TABLE IF NOT EXISTS app.pilots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'pilot',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_by_user_id BIGINT,
  activated_at TIMESTAMPTZ,
  closed_by_user_id BIGINT,
  closed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS app.pilot_conditions (
  pilot_id BIGINT NOT NULL REFERENCES app.pilots(id),
  condition_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('auto', 'attestation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'satisfied')),
  evidence_ref TEXT,
  satisfied_by_user_id BIGINT,
  satisfied_at TIMESTAMPTZ,
  PRIMARY KEY (pilot_id, condition_key)
);
CREATE INDEX IF NOT EXISTS idx_pilots_status ON app.pilots (status);
