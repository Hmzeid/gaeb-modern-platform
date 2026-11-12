-- Migration management schema: every import batch, rejected record and job checkpoint
-- is persisted so a cutover evidence package can be produced (Directive §14).
CREATE SCHEMA IF NOT EXISTS mig;
CREATE TABLE IF NOT EXISTS mig.batches (
  batch_id TEXT PRIMARY KEY, source_file TEXT NOT NULL, source_sha256 TEXT NOT NULL,
  layout_name TEXT NOT NULL, total_records INTEGER NOT NULL, loaded INTEGER NOT NULL,
  rejected INTEGER NOT NULL, control_totals JSONB NOT NULL DEFAULT '{}',
  source_totals JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(), finished_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS mig.rejects (
  id BIGSERIAL PRIMARY KEY, batch_id TEXT NOT NULL REFERENCES mig.batches(batch_id),
  record_offset INTEGER NOT NULL, reason TEXT NOT NULL, raw_hex TEXT NOT NULL,
  resubmitted_batch TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (batch_id, record_offset));
CREATE TABLE IF NOT EXISTS mig.job_state (
  batch_id TEXT PRIMARY KEY, next_offset INTEGER NOT NULL DEFAULT 0,
  loaded_keys JSONB NOT NULL DEFAULT '[]', updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
