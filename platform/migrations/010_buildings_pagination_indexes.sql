-- Phase 9 (A3): indexes supporting server-side School Map pagination,
-- filtering and search over app.buildings at registry scale.
CREATE INDEX IF NOT EXISTS idx_buildings_governorate ON app.buildings (governorate_code, id);
CREATE INDEX IF NOT EXISTS idx_buildings_name_en ON app.buildings (name_en, id);
CREATE INDEX IF NOT EXISTS idx_buildings_name_ar ON app.buildings (name_ar, id);
CREATE INDEX IF NOT EXISTS idx_buildings_legacy_blcd ON app.buildings (legacy_blcd, id);
