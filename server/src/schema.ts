// GAEB Modern Platform schema — modernized from AS/400 library NEWLIBGAEB.
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const ts = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  role: text("role", {
    enum: ["admin", "budget", "contracts", "technical", "viewer"],
  }).notNull(),
  createdAt: ts(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  createdAt: ts(),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityLabel: text("entity_label").notNull(),
  details: text("details").notNull().default(""),
  createdAt: ts(),
});

// ---- Reference data ----
export const governorates = sqliteTable("governorates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
});

export const centers = sqliteTable("centers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  governorateId: integer("governorate_id").notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
});

export const villages = sqliteTable("villages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  centerId: integer("center_id").notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
});

export const stages = sqliteTable("stages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
});

export const ownershipTypes = sqliteTable("ownership_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
});

// ---- School Map (legacy PBLBULDG / PLN105PF) ----
export const buildings = sqliteTable("buildings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  governorateId: integer("governorate_id"),
  centerId: integer("center_id"),
  villageId: integer("village_id"),
  stageId: integer("stage_id"),
  eduType: text("edu_type").notNull().default(""),
  ownershipId: integer("ownership_id"),
  landOwner: text("land_owner").notNull().default(""),
  plotArea: real("plot_area").notNull().default(0),
  buildingArea: real("building_area").notNull().default(0),
  floors: integer("floors").notNull().default(0),
  classrooms: integer("classrooms").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: ts(),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buildingId: integer("building_id"),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  status: text("status").notNull().default("planned"),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  budget: real("budget").notNull().default(0),
  progress: integer("progress").notNull().default(0),
  createdAt: ts(),
});

// ---- Budget (legacy CBABDALW / CBARECPF) ----
export const fiscalYears = sqliteTable("fiscal_years", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  year: text("year").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("open"),
});

export const allocations = sqliteTable("allocations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fiscalYearId: integer("fiscal_year_id"),
  chapter: text("chapter").notNull(),
  item: text("item").notNull(),
  governorateId: integer("governorate_id"),
  allocated: real("allocated").notNull().default(0),
  spent: real("spent").notNull().default(0),
  createdAt: ts(),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["payment", "receipt"] }).notNull(),
  txnDate: text("txn_date").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull().default(0),
  allocationId: integer("allocation_id"),
  refNo: text("ref_no").notNull().default(""),
  createdAt: ts(),
});

// ---- Purchases & Contracts (legacy PBYTENDR / PBYPARTT / PBYCLAIM) ----
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  contact: text("contact").notNull().default(""),
  taxId: text("tax_id").notNull().default(""),
  createdAt: ts(),
});

export const tenders = sqliteTable("tenders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  number: text("number").notNull(),
  tenderType: text("tender_type").notNull(),
  titleEn: text("title_en").notNull(),
  titleAr: text("title_ar").notNull(),
  status: text("status").notNull().default("open"),
  openDate: text("open_date").notNull().default(""),
  closeDate: text("close_date").notNull().default(""),
  createdAt: ts(),
});

export const offers = sqliteTable("offers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenderId: integer("tender_id").notNull(),
  supplierId: integer("supplier_id"),
  amount: real("amount").notNull().default(0),
  status: text("status").notNull().default("submitted"),
  createdAt: ts(),
});

export const claims = sqliteTable("claims", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenderId: integer("tender_id"),
  supplierId: integer("supplier_id"),
  amount: real("amount").notNull().default(0),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"),
  claimDate: text("claim_date").notNull().default(""),
  createdAt: ts(),
});

// ---- Technical Abstracts (legacy INV001PF / INVO01PF) ----
export const certificates = sqliteTable("certificates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  certNo: text("cert_no").notNull(),
  buildingId: integer("building_id"),
  contractor: text("contractor").notNull(),
  contractRef: text("contract_ref").notNull().default(""),
  certType: text("cert_type").notNull().default("construction"),
  periodFrom: text("period_from").notNull().default(""),
  periodTo: text("period_to").notNull().default(""),
  deductionsPct: real("deductions_pct").notNull().default(0),
  status: text("status", {
    enum: ["draft", "submitted", "approved", "paid"],
  })
    .notNull()
    .default("draft"),
  createdAt: ts(),
});

export const certItems = sqliteTable("cert_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  certId: integer("cert_id").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull().default(""),
  quantity: real("quantity").notNull().default(0),
  price: real("price").notNull().default(0),
});

// ---- Estimates / BOQ ----
export const estimates = sqliteTable("estimates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  docNo: text("doc_no").notNull(),
  buildingId: integer("building_id"),
  projectName: text("project_name").notNull(),
  estType: text("est_type").notNull().default("construction"),
  status: text("status").notNull().default("draft"),
  createdAt: ts(),
});

export const estimateItems = sqliteTable("estimate_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  estimateId: integer("estimate_id").notNull(),
  description: text("description").notNull(),
  unit: text("unit").notNull().default(""),
  quantity: real("quantity").notNull().default(0),
  unitPrice: real("unit_price").notNull().default(0),
});

// ---- Real Estate (legacy REMV01PF / RNT003PF / PRC002PF) ----
export const lands = sqliteTable("lands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  locationEn: text("location_en").notNull(),
  locationAr: text("location_ar").notNull(),
  governorateId: integer("governorate_id"),
  area: real("area").notNull().default(0),
  ownership: text("ownership").notNull().default(""),
  status: text("status").notNull().default("available"),
  createdAt: ts(),
});

export const leases = sqliteTable("leases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buildingId: integer("building_id"),
  lessor: text("lessor").notNull(),
  annualRent: real("annual_rent").notNull().default(0),
  startDate: text("start_date").notNull().default(""),
  endDate: text("end_date").notNull().default(""),
  status: text("status").notNull().default("active"),
  createdAt: ts(),
});

export const expropriations = sqliteTable("expropriations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseNo: text("case_no").notNull(),
  landId: integer("land_id"),
  owner: text("owner").notNull(),
  compensation: real("compensation").notNull().default(0),
  status: text("status").notNull().default("open"),
  createdAt: ts(),
});

// ---- Migration Center ----
export const legacyFiles = sqliteTable("legacy_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  member: text("member").notNull(),
  subsystem: text("subsystem").notNull(),
  kind: text("kind").notNull(), // PF | LF
  fieldCount: integer("field_count").notNull().default(0),
  keysText: text("keys_text").notNull().default(""),
  description: text("description").notNull().default(""),
  modernTable: text("modern_table").notNull().default(""),
});

export const fieldMappings = sqliteTable("field_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  legacyFileId: integer("legacy_file_id").notNull(),
  legacyField: text("legacy_field").notNull(),
  legacyType: text("legacy_type").notNull(),
  modernColumn: text("modern_column").notNull(),
  modernType: text("modern_type").notNull(),
  notes: text("notes").notNull().default(""),
});

export const stagingBuildings = sqliteTable("staging_buildings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  blcd: text("blcd").notNull(),
  nameEn: text("name_en").notNull().default(""),
  nameAr: text("name_ar").notNull().default(""),
  govCode: text("gov_code").notNull().default(""),
  stageName: text("stage_name").notNull().default(""),
  plotArea: real("plot_area").notNull().default(0),
  classrooms: integer("classrooms").notNull().default(0),
  loaded: integer("loaded").notNull().default(0),
});

export const stagingBudget = sqliteTable("staging_budget", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  lwyear: text("lwyear").notNull(),
  lwtas: text("lwtas").notNull().default(""),
  item: text("item").notNull().default(""),
  govCode: text("gov_code").notNull().default(""),
  amount: real("amount").notNull().default(0),
  loaded: integer("loaded").notNull().default(0),
});

export const migrationJobs = sqliteTable("migration_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  module: text("module").notNull(),
  status: text("status").notNull().default("completed"),
  rowsRead: integer("rows_read").notNull().default(0),
  rowsLoaded: integer("rows_loaded").notNull().default(0),
  rowsRejected: integer("rows_rejected").notNull().default(0),
  messages: text("messages").notNull().default("[]"),
  startedBy: text("started_by").notNull(),
  createdAt: ts(),
});

export const moduleStatus = sqliteTable("module_status", {
  key: text("key").primaryKey(),
  status: text("status").notNull(),
  percent: integer("percent").notNull().default(0),
});
