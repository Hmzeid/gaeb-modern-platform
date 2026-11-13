-- Migration integrity (Phase 1): append-only run ledger, cumulative totals,
-- authenticated mapping approvals, verified layout registry.
CREATE TABLE IF NOT EXISTS mig.batch_runs (
  id BIGSERIAL PRIMARY KEY, batch_id TEXT NOT NULL, start_offset INTEGER NOT NULL,
  source_sha256 TEXT NOT NULL, loaded INTEGER NOT NULL, rejected_new INTEGER NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, start_offset, source_sha256));
CREATE TABLE IF NOT EXISTS mig.batch_totals (
  batch_id TEXT NOT NULL, field TEXT NOT NULL, kind TEXT NOT NULL CHECK (kind IN ('control','source')),
  amount NUMERIC(38,6) NOT NULL DEFAULT 0,
  PRIMARY KEY (batch_id, field, kind));
CREATE TABLE IF NOT EXISTS mig.mapping_approvals (
  id BIGSERIAL PRIMARY KEY, legacy_member TEXT NOT NULL, legacy_field TEXT NOT NULL,
  target_table TEXT NOT NULL, target_column TEXT NOT NULL, transform_name TEXT NOT NULL,
  transform_hash TEXT NOT NULL, approved_by TEXT NOT NULL, evidence_ref TEXT NOT NULL DEFAULT '',
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (legacy_member, legacy_field, transform_name));
CREATE TABLE IF NOT EXISTS mig.layouts (
  name TEXT PRIMARY KEY, sha256 TEXT NOT NULL, layout_json JSONB NOT NULL,
  registered_by TEXT NOT NULL, registered_at TIMESTAMPTZ NOT NULL DEFAULT now());
