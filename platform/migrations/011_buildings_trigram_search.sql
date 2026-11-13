-- Phase 9 (A3): trigram indexes so substring search (ILIKE '%...%')
-- stays index-backed at registry scale. Guarded: if the pg_trgm
-- extension is unavailable in the target environment, the migration
-- succeeds without the indexes and search falls back to a sequential
-- scan (correct, slower) instead of failing the deployment.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm unavailable; trigram search indexes skipped';
  END;
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_buildings_name_en_trgm ON app.buildings USING gin (name_en gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_buildings_name_ar_trgm ON app.buildings USING gin (name_ar gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_buildings_blcd_trgm ON app.buildings USING gin (legacy_blcd gin_trgm_ops);
  END IF;
END $$;
