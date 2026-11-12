-- Estimates / BOQ (legacy Estimates subsystem: ADM* drafts, ADMR* reviewed, PMPITMAR catalogue).
-- Catalogue-only rule is enforced structurally: estimate_items.catalogue_item_id is a
-- NOT NULL foreign key — a line cannot exist unless it references the standard catalogue,
-- exactly as legacy entry was restricted to PMPITMAR items via CAT005RR.
CREATE TABLE IF NOT EXISTS app.item_catalogue (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,               -- legacy item code (ITCD lineage)
  name_en TEXT NOT NULL DEFAULT '', name_ar TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  standard_price NUMERIC(19,6) NOT NULL CHECK (standard_price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE IF NOT EXISTS app.estimates (
  id BIGSERIAL PRIMARY KEY,
  building_id BIGINT REFERENCES app.buildings(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','approved')),
  revision INTEGER NOT NULL DEFAULT 1,
  total NUMERIC(19,4) NOT NULL DEFAULT 0,
  created_by BIGINT, reviewed_by BIGINT, approved_by BIGINT,
  legacy_key TEXT,                          -- ADMDOC lineage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status = 'draft' OR reviewed_by IS NOT NULL),
  CHECK (status <> 'approved' OR approved_by IS NOT NULL));
CREATE TABLE IF NOT EXISTS app.estimate_items (
  id BIGSERIAL PRIMARY KEY,
  estimate_id BIGINT NOT NULL REFERENCES app.estimates(id) ON DELETE CASCADE,
  catalogue_item_id BIGINT NOT NULL REFERENCES app.item_catalogue(id),
  qty NUMERIC(19,6) NOT NULL CHECK (qty >= 0),
  price NUMERIC(19,6) NOT NULL CHECK (price >= 0),   -- snapshot of catalogue price at entry
  value NUMERIC(19,4) NOT NULL);
CREATE TABLE IF NOT EXISTS app.estimate_revisions (
  id BIGSERIAL PRIMARY KEY, estimate_id BIGINT NOT NULL REFERENCES app.estimates(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL, total NUMERIC(19,4) NOT NULL, changed_by BIGINT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(), note TEXT NOT NULL DEFAULT '');
