DROP TABLE IF EXISTS entries;
--> statement-breakpoint
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_label TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE governorates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE centers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  governorate_id INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE villages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  center_id INTEGER NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE ownership_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  governorate_id INTEGER,
  center_id INTEGER,
  village_id INTEGER,
  stage_id INTEGER,
  edu_type TEXT NOT NULL DEFAULT '',
  ownership_id INTEGER,
  land_owner TEXT NOT NULL DEFAULT '',
  plot_area REAL NOT NULL DEFAULT 0,
  building_area REAL NOT NULL DEFAULT 0,
  floors INTEGER NOT NULL DEFAULT 0,
  classrooms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  budget REAL NOT NULL DEFAULT 0,
  progress INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE fiscal_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
);
--> statement-breakpoint
CREATE TABLE allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fiscal_year_id INTEGER,
  chapter TEXT NOT NULL,
  item TEXT NOT NULL,
  governorate_id INTEGER,
  allocated REAL NOT NULL DEFAULT 0,
  spent REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  txn_date TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  allocation_id INTEGER,
  ref_no TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  contact TEXT NOT NULL DEFAULT '',
  tax_id TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE tenders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL,
  tender_type TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  open_date TEXT NOT NULL DEFAULT '',
  close_date TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tender_id INTEGER NOT NULL,
  supplier_id INTEGER,
  amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tender_id INTEGER,
  supplier_id INTEGER,
  amount REAL NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  claim_date TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cert_no TEXT NOT NULL,
  building_id INTEGER,
  contractor TEXT NOT NULL,
  contract_ref TEXT NOT NULL DEFAULT '',
  cert_type TEXT NOT NULL DEFAULT 'construction',
  period_from TEXT NOT NULL DEFAULT '',
  period_to TEXT NOT NULL DEFAULT '',
  deductions_pct REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE cert_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cert_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE estimates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_no TEXT NOT NULL,
  building_id INTEGER,
  project_name TEXT NOT NULL,
  est_type TEXT NOT NULL DEFAULT 'construction',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE estimate_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estimate_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT '',
  quantity REAL NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE lands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  location_en TEXT NOT NULL,
  location_ar TEXT NOT NULL,
  governorate_id INTEGER,
  area REAL NOT NULL DEFAULT 0,
  ownership TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE leases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_id INTEGER,
  lessor TEXT NOT NULL,
  annual_rent REAL NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE expropriations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_no TEXT NOT NULL,
  land_id INTEGER,
  owner TEXT NOT NULL,
  compensation REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE legacy_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member TEXT NOT NULL,
  subsystem TEXT NOT NULL,
  kind TEXT NOT NULL,
  field_count INTEGER NOT NULL DEFAULT 0,
  keys_text TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  modern_table TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE field_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  legacy_file_id INTEGER NOT NULL,
  legacy_field TEXT NOT NULL,
  legacy_type TEXT NOT NULL,
  modern_column TEXT NOT NULL,
  modern_type TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE staging_buildings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blcd TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  name_ar TEXT NOT NULL DEFAULT '',
  gov_code TEXT NOT NULL DEFAULT '',
  stage_name TEXT NOT NULL DEFAULT '',
  plot_area REAL NOT NULL DEFAULT 0,
  classrooms INTEGER NOT NULL DEFAULT 0,
  loaded INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE staging_budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lwyear TEXT NOT NULL,
  lwtas TEXT NOT NULL DEFAULT '',
  item TEXT NOT NULL DEFAULT '',
  gov_code TEXT NOT NULL DEFAULT '',
  amount REAL NOT NULL DEFAULT 0,
  loaded INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE migration_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  rows_read INTEGER NOT NULL DEFAULT 0,
  rows_loaded INTEGER NOT NULL DEFAULT 0,
  rows_rejected INTEGER NOT NULL DEFAULT 0,
  messages TEXT NOT NULL DEFAULT '[]',
  started_by TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE module_status (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  percent INTEGER NOT NULL DEFAULT 0
);
