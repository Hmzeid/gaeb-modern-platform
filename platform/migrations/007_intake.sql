-- Phase 4 (Workstream C): the controlled intake pipeline.
-- Receive -> Register -> Verify -> Profile -> Map -> Approve -> Import ->
-- Reconcile -> Review -> Accept. Every dataset moves through explicit stages,
-- each transition recorded with the acting user and its evidence. 'rejected'
-- is the only off-path terminal state; stages may never be skipped forward.
CREATE TABLE IF NOT EXISTS mig.intake_datasets (
  id BIGSERIAL PRIMARY KEY,
  member TEXT NOT NULL,
  layout_name TEXT,
  layout_hash TEXT,
  source_sha256 TEXT,
  size_bytes BIGINT,
  batch_id TEXT,
  data_class TEXT NOT NULL DEFAULT 'customer',
  stage TEXT NOT NULL DEFAULT 'received'
    CHECK (stage IN ('received','registered','verified','profiled','mapped','approved',
                     'imported','reconciled','reviewed','accepted','rejected')),
  created_by_user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mig.intake_events (
  id BIGSERIAL PRIMARY KEY,
  dataset_id BIGINT NOT NULL REFERENCES mig.intake_datasets(id),
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  evidence TEXT,
  actor_user_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_intake_stage ON mig.intake_datasets(stage);
CREATE INDEX IF NOT EXISTS ix_intake_events_ds ON mig.intake_events(dataset_id);
