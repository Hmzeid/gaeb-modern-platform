-- Phase 5 (Workstream C): enterprise import orchestration.
-- A job is the EXECUTION record for one import attempt series; the intake
-- dataset (007) remains the GOVERNANCE record. A completed job does NOT imply
-- customer acceptance — acceptance lives in the intake pipeline's final stages.
-- Worker ownership is a lease: a claim is atomic, expires, and an expired
-- lease may be reclaimed (worker crash recovery). Every transition is evented.
CREATE TABLE IF NOT EXISTS mig.import_jobs (
  id BIGSERIAL PRIMARY KEY,
  dataset_id BIGINT REFERENCES mig.intake_datasets(id),
  batch_id TEXT,
  member TEXT NOT NULL,
  layout_name TEXT NOT NULL,
  source_sha256 TEXT,
  state TEXT NOT NULL DEFAULT 'QUEUED'
    CHECK (state IN ('QUEUED','VALIDATING','RUNNING','RECONCILING','COMPLETED','FAILED','CANCELLED','RECOVERING')),
  claimed_by TEXT,
  lease_expires_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  failure_class TEXT,
  error TEXT,
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mig.import_job_events (
  id BIGSERIAL PRIMARY KEY,
  job_id BIGINT NOT NULL REFERENCES mig.import_jobs(id),
  from_state TEXT, to_state TEXT NOT NULL,
  actor TEXT NOT NULL, note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_import_jobs_state ON mig.import_jobs(state);
-- At most one ACTIVE job per source extract: a duplicate submission of the
-- same file while a job is live is refused by the database, not by convention.
CREATE UNIQUE INDEX IF NOT EXISTS ux_import_jobs_active_sha
  ON mig.import_jobs (source_sha256)
  WHERE source_sha256 IS NOT NULL AND state IN ('QUEUED','VALIDATING','RUNNING','RECONCILING','RECOVERING');
