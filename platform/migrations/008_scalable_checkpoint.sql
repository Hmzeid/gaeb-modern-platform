-- Phase 5 (Workstream B): eliminate the O(n^2) checkpoint bottleneck.
-- Diagnosis: mig.job_state.loaded_keys stored the ENTIRE loaded-key set as JSONB,
-- re-serialized on every chunk commit — chunk k wrote O(k * chunk) bytes, and a
-- resume had to load and parse the whole set. Total checkpoint bytes were
-- quadratic in the record count (measured: 25 MB file -> RSS +62 MB, throughput
-- fell 4,289 -> 2,737 rec/s as the set grew).
-- Fix: keys live in an indexed table, inserted incrementally (only the chunk's
-- new keys, O(chunk) per commit). The checkpoint row carries just the offset
-- and a key count — O(1) to write and to restore.
CREATE TABLE IF NOT EXISTS mig.loaded_keys (
  batch_id TEXT NOT NULL,
  key_value TEXT NOT NULL,
  PRIMARY KEY (batch_id, key_value)
);
ALTER TABLE mig.job_state ADD COLUMN IF NOT EXISTS key_count BIGINT NOT NULL DEFAULT 0;
