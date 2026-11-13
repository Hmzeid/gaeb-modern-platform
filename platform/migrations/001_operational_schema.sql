-- GAEB operational schema (PostgreSQL) — Milestone 2 scaffold.
-- Money is NUMERIC(19,4); quantities NUMERIC(19,6); NO float/real anywhere in financial paths.
-- The legacy-shaped staging layer lives in migration/reconciled/schema_v2.sql (schemas budget,
-- school_map, abstracts, purchases, real_estate, estimates) and is loaded separately by the
-- migration engine; this file is the clean operational model the application runs on.
CREATE SCHEMA IF NOT EXISTS app;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app.users (
  id BIGSERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '', name_ar TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('admin','budget','contracts','technical','realestate','viewer')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app.sessions (
  token_key TEXT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES app.users(id),
  expires_at TIMESTAMPTZ NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app.audit_log (
  id BIGSERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now(), user_id BIGINT,
  action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT, detail JSONB NOT NULL DEFAULT '{}');

CREATE TABLE IF NOT EXISTS app.governorates (
  code INTEGER PRIMARY KEY, name_en TEXT NOT NULL, name_ar TEXT NOT NULL, regional_center INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS app.buildings (
  id BIGSERIAL PRIMARY KEY,
  legacy_blcd TEXT UNIQUE,               -- natural key preserved from PBLBULDG (BLCD)
  name_en TEXT NOT NULL DEFAULT '', name_ar TEXT NOT NULL DEFAULT '',
  governorate_code INTEGER REFERENCES app.governorates(code),
  center_code INTEGER, village_code INTEGER, stage_code INTEGER,
  plot_area NUMERIC(19,4) NOT NULL DEFAULT 0, building_area NUMERIC(19,4) NOT NULL DEFAULT 0,
  floors INTEGER NOT NULL DEFAULT 0, classrooms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app.budget_allocations (
  id BIGSERIAL PRIMARY KEY, fiscal_year TEXT NOT NULL, chapter INTEGER NOT NULL, item INTEGER NOT NULL,
  governorate_code INTEGER REFERENCES app.governorates(code),
  allocated NUMERIC(19,4) NOT NULL DEFAULT 0, committed NUMERIC(19,4) NOT NULL DEFAULT 0,
  spent NUMERIC(19,4) NOT NULL DEFAULT 0,
  CHECK (spent >= 0 AND committed >= 0 AND allocated >= 0));
CREATE TABLE IF NOT EXISTS app.tenders (
  id BIGSERIAL PRIMARY KEY, legacy_type INTEGER, legacy_no BIGINT,
  title TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'draft', created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (legacy_type, legacy_no));
CREATE TABLE IF NOT EXISTS app.certificates (
  id BIGSERIAL PRIMARY KEY, building_id BIGINT REFERENCES app.buildings(id),
  kind TEXT NOT NULL CHECK (kind IN ('construction','maintenance')),
  status TEXT NOT NULL DEFAULT 'draft',
  gross NUMERIC(19,4) NOT NULL DEFAULT 0, deductions NUMERIC(19,4) NOT NULL DEFAULT 0,
  net NUMERIC(19,4) NOT NULL DEFAULT 0, payment_ref TEXT,
  legacy_key TEXT,                        -- BLCD+SUBTYP+TTNCD+DOCCD lineage
  created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS app.certificate_items (
  id BIGSERIAL PRIMARY KEY, certificate_id BIGINT NOT NULL REFERENCES app.certificates(id) ON DELETE CASCADE,
  description TEXT NOT NULL, unit TEXT NOT NULL DEFAULT '',
  qty NUMERIC(19,6) NOT NULL, price NUMERIC(19,6) NOT NULL, value NUMERIC(19,4) NOT NULL);
CREATE TABLE IF NOT EXISTS app.expropriation_cases (
  id BIGSERIAL PRIMARY KEY, building_id BIGINT REFERENCES app.buildings(id),
  stage TEXT NOT NULL DEFAULT 'pre_decree' CHECK (stage IN ('pre_decree','post_decree')),
  decree_no TEXT, decree_date DATE, gazette_no TEXT,
  compensation NUMERIC(19,4), created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (stage = 'pre_decree' OR (decree_no IS NOT NULL AND decree_date IS NOT NULL AND gazette_no IS NOT NULL)));
