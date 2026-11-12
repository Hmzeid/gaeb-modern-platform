// GAEB Modern Platform actions: auth + roles, CRUD for all modules,
// certificates/estimates with line items, legacy inventory, migration ETL,
// dashboard and audit log.
import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword, seedAll } from "./seed";

type DB = ReturnType<Ctx["db"]>;
type UserRow = typeof schema.users.$inferSelect;
type Scalar = string | number | boolean | null;
type Row = Record<string, Scalar>;

const scalarRecord = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

function serialize(row: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null)
      out[k] = v;
    else if (v === undefined) out[k] = null;
    else out[k] = String(v);
  }
  return out;
}

async function requireUser(ctx: Ctx, token: string): Promise<UserRow> {
  const db = ctx.db<typeof schema>();
  const sess = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.token, token))
    .limit(1);
  const s = sess[0];
  if (!s) throw new Error("Session expired. Please sign in again.");
  const users = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, s.userId))
    .limit(1);
  const u = users[0];
  if (!u) throw new Error("Session expired. Please sign in again.");
  return u;
}

function requireWrite(user: UserRow, roles: string[]): void {
  if (user.role === "viewer") throw new Error("Viewers have read-only access.");
  if (!roles.includes(user.role))
    throw new Error(`Your role (${user.role}) cannot modify this module.`);
}

async function audit(
  db: DB,
  username: string,
  action: string,
  entity: string,
  entityLabel: string,
  details: string,
): Promise<void> {
  await db.insert(schema.auditLog).values({ username, action, entity, entityLabel, details });
}

// ---------- Generic entity CRUD configuration ----------
type EntityCfg = {
  fields: string[];
  writeRoles: string[];
  labelField: string;
  list: (db: DB) => Promise<Array<Record<string, unknown>>>;
  insert: (db: DB, v: Record<string, unknown>) => Promise<number>;
  update: (db: DB, id: number, v: Record<string, unknown>) => Promise<void>;
  remove: (db: DB, id: number) => Promise<void>;
};

function makeCfg(
  fields: string[],
  writeRoles: string[],
  labelField: string,
  ops: {
    list: (db: DB) => Promise<Array<Record<string, unknown>>>;
    insert: (db: DB, v: Record<string, unknown>) => Promise<number>;
    update: (db: DB, id: number, v: Record<string, unknown>) => Promise<void>;
    remove: (db: DB, id: number) => Promise<void>;
  },
): EntityCfg {
  return { fields, writeRoles, labelField, ...ops };
}

const ENTITIES: Record<string, EntityCfg> = {
  governorates: makeCfg(["code", "nameEn", "nameAr"], ["admin"], "nameEn", {
    list: (db) => db.select().from(schema.governorates).orderBy(asc(schema.governorates.id)) as never,
    insert: async (db, v) => (await db.insert(schema.governorates).values(v as never).returning({ id: schema.governorates.id }))[0]?.id ?? 0,
    update: async (db, id, v) => { await db.update(schema.governorates).set(v as never).where(eq(schema.governorates.id, id)); },
    remove: async (db, id) => { await db.delete(schema.governorates).where(eq(schema.governorates.id, id)); },
  }),
  centers: makeCfg(["governorateId", "nameEn", "nameAr"], ["admin"], "nameEn", {
    list: (db) => db.select().from(schema.centers).orderBy(asc(schema.centers.id)) as never,
    insert: async (db, v) => (await db.insert(schema.centers).values(v as never).returning({ id: schema.centers.id }))[0]?.id ?? 0,
    update: async (db, id, v) => { await db.update(schema.centers).set(v as never).where(eq(schema.centers.id, id)); },
    remove: async (db, id) => { await db.delete(schema.centers).where(eq(schema.centers.id, id)); },
  }),
  villages: makeCfg(["centerId", "nameEn", "nameAr"], ["admin"], "nameEn", {
    list: (db) => db.select().from(schema.villages).orderBy(asc(schema.villages.id)) as never,
    insert: async (db, v) => (await db.insert(schema.villages).values(v as never).returning({ id: schema.villages.id }))[0]?.id ?? 0,
    update: async (db, id, v) => { await db.update(schema.villages).set(v as never).where(eq(schema.villages.id, id)); },
    remove: async (db, id) => { await db.delete(schema.villages).where(eq(schema.villages.id, id)); },
  }),
  stages: makeCfg(["nameEn", "nameAr"], ["admin"], "nameEn", {
    list: (db) => db.select().from(schema.stages).orderBy(asc(schema.stages.id)) as never,
    insert: async (db, v) => (await db.insert(schema.stages).values(v as never).returning({ id: schema.stages.id }))[0]?.id ?? 0,
    update: async (db, id, v) => { await db.update(schema.stages).set(v as never).where(eq(schema.stages.id, id)); },
    remove: async (db, id) => { await db.delete(schema.stages).where(eq(schema.stages.id, id)); },
  }),
  ownershipTypes: makeCfg(["nameEn", "nameAr"], ["admin"], "nameEn", {
    list: (db) => db.select().from(schema.ownershipTypes).orderBy(asc(schema.ownershipTypes.id)) as never,
    insert: async (db, v) => (await db.insert(schema.ownershipTypes).values(v as never).returning({ id: schema.ownershipTypes.id }))[0]?.id ?? 0,
    update: async (db, id, v) => { await db.update(schema.ownershipTypes).set(v as never).where(eq(schema.ownershipTypes.id, id)); },
    remove: async (db, id) => { await db.delete(schema.ownershipTypes).where(eq(schema.ownershipTypes.id, id)); },
  }),
  buildings: makeCfg(
    ["code", "nameEn", "nameAr", "governorateId", "centerId", "villageId", "stageId", "eduType", "ownershipId", "landOwner", "plotArea", "buildingArea", "floors", "classrooms", "status"],
    ["admin", "technical"], "code", {
      list: (db) => db.select().from(schema.buildings).orderBy(asc(schema.buildings.code)) as never,
      insert: async (db, v) => (await db.insert(schema.buildings).values(v as never).returning({ id: schema.buildings.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.buildings).set(v as never).where(eq(schema.buildings.id, id)); },
      remove: async (db, id) => { await db.delete(schema.buildings).where(eq(schema.buildings.id, id)); },
    }),
  projects: makeCfg(
    ["buildingId", "nameEn", "nameAr", "status", "startDate", "endDate", "budget", "progress"],
    ["admin", "technical"], "nameEn", {
      list: (db) => db.select().from(schema.projects).orderBy(desc(schema.projects.id)) as never,
      insert: async (db, v) => (await db.insert(schema.projects).values(v as never).returning({ id: schema.projects.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.projects).set(v as never).where(eq(schema.projects.id, id)); },
      remove: async (db, id) => { await db.delete(schema.projects).where(eq(schema.projects.id, id)); },
    }),
  fiscalYears: makeCfg(["year", "label", "status"], ["admin", "budget"], "year", {
    list: (db) => db.select().from(schema.fiscalYears).orderBy(asc(schema.fiscalYears.id)) as never,
    insert: async (db, v) => (await db.insert(schema.fiscalYears).values(v as never).returning({ id: schema.fiscalYears.id }))[0]?.id ?? 0,
    update: async (db, id, v) => { await db.update(schema.fiscalYears).set(v as never).where(eq(schema.fiscalYears.id, id)); },
    remove: async (db, id) => { await db.delete(schema.fiscalYears).where(eq(schema.fiscalYears.id, id)); },
  }),
  allocations: makeCfg(
    ["fiscalYearId", "chapter", "item", "governorateId", "allocated", "spent"],
    ["admin", "budget"], "item", {
      list: (db) => db.select().from(schema.allocations).orderBy(desc(schema.allocations.id)) as never,
      insert: async (db, v) => (await db.insert(schema.allocations).values(v as never).returning({ id: schema.allocations.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.allocations).set(v as never).where(eq(schema.allocations.id, id)); },
      remove: async (db, id) => { await db.delete(schema.allocations).where(eq(schema.allocations.id, id)); },
    }),
  transactions: makeCfg(
    ["kind", "txnDate", "description", "amount", "allocationId", "refNo"],
    ["admin", "budget"], "description", {
      list: (db) => db.select().from(schema.transactions).orderBy(desc(schema.transactions.id)) as never,
      insert: async (db, v) => (await db.insert(schema.transactions).values(v as never).returning({ id: schema.transactions.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.transactions).set(v as never).where(eq(schema.transactions.id, id)); },
      remove: async (db, id) => { await db.delete(schema.transactions).where(eq(schema.transactions.id, id)); },
    }),
  suppliers: makeCfg(["nameEn", "nameAr", "contact", "taxId"], ["admin", "contracts"], "nameEn", {
    list: (db) => db.select().from(schema.suppliers).orderBy(asc(schema.suppliers.id)) as never,
    insert: async (db, v) => (await db.insert(schema.suppliers).values(v as never).returning({ id: schema.suppliers.id }))[0]?.id ?? 0,
    update: async (db, id, v) => { await db.update(schema.suppliers).set(v as never).where(eq(schema.suppliers.id, id)); },
    remove: async (db, id) => { await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id)); },
  }),
  tenders: makeCfg(
    ["number", "tenderType", "titleEn", "titleAr", "status", "openDate", "closeDate"],
    ["admin", "contracts"], "number", {
      list: (db) => db.select().from(schema.tenders).orderBy(desc(schema.tenders.id)) as never,
      insert: async (db, v) => (await db.insert(schema.tenders).values(v as never).returning({ id: schema.tenders.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.tenders).set(v as never).where(eq(schema.tenders.id, id)); },
      remove: async (db, id) => { await db.delete(schema.tenders).where(eq(schema.tenders.id, id)); },
    }),
  offers: makeCfg(["tenderId", "supplierId", "amount", "status"], ["admin", "contracts"], "id", {
    list: (db) => db.select().from(schema.offers).orderBy(asc(schema.offers.id)) as never,
    insert: async (db, v) => (await db.insert(schema.offers).values(v as never).returning({ id: schema.offers.id }))[0]?.id ?? 0,
    update: async (db, id, v) => { await db.update(schema.offers).set(v as never).where(eq(schema.offers.id, id)); },
    remove: async (db, id) => { await db.delete(schema.offers).where(eq(schema.offers.id, id)); },
  }),
  claims: makeCfg(
    ["tenderId", "supplierId", "amount", "description", "status", "claimDate"],
    ["admin", "contracts"], "description", {
      list: (db) => db.select().from(schema.claims).orderBy(desc(schema.claims.id)) as never,
      insert: async (db, v) => (await db.insert(schema.claims).values(v as never).returning({ id: schema.claims.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.claims).set(v as never).where(eq(schema.claims.id, id)); },
      remove: async (db, id) => { await db.delete(schema.claims).where(eq(schema.claims.id, id)); },
    }),
  lands: makeCfg(
    ["code", "locationEn", "locationAr", "governorateId", "area", "ownership", "status"],
    ["admin", "technical"], "code", {
      list: (db) => db.select().from(schema.lands).orderBy(asc(schema.lands.code)) as never,
      insert: async (db, v) => (await db.insert(schema.lands).values(v as never).returning({ id: schema.lands.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.lands).set(v as never).where(eq(schema.lands.id, id)); },
      remove: async (db, id) => { await db.delete(schema.lands).where(eq(schema.lands.id, id)); },
    }),
  leases: makeCfg(
    ["buildingId", "lessor", "annualRent", "startDate", "endDate", "status"],
    ["admin", "technical"], "lessor", {
      list: (db) => db.select().from(schema.leases).orderBy(desc(schema.leases.id)) as never,
      insert: async (db, v) => (await db.insert(schema.leases).values(v as never).returning({ id: schema.leases.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.leases).set(v as never).where(eq(schema.leases.id, id)); },
      remove: async (db, id) => { await db.delete(schema.leases).where(eq(schema.leases.id, id)); },
    }),
  expropriations: makeCfg(
    ["caseNo", "landId", "owner", "compensation", "status"],
    ["admin", "technical"], "caseNo", {
      list: (db) => db.select().from(schema.expropriations).orderBy(desc(schema.expropriations.id)) as never,
      insert: async (db, v) => (await db.insert(schema.expropriations).values(v as never).returning({ id: schema.expropriations.id }))[0]?.id ?? 0,
      update: async (db, id, v) => { await db.update(schema.expropriations).set(v as never).where(eq(schema.expropriations.id, id)); },
      remove: async (db, id) => { await db.delete(schema.expropriations).where(eq(schema.expropriations.id, id)); },
    }),
};

function pickFields(cfg: EntityCfg, values: Record<string, Scalar>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of cfg.fields) {
    if (f in values) out[f] = values[f];
  }
  return out;
}

const okResponse = z.object({ ok: z.literal(true) });

export const Actions = {
  ensureSeed: defineAction({
    description: "Seeds the platform once (users, reference data, module starter data, legacy inventory, staging rows) if the database is empty.",
    request: z.object({}),
    response: z.object({ seeded: z.boolean() }),
    async handler(ctx): Promise<{ seeded: boolean }> {
      const db = ctx.db<typeof schema>();
      const existing = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
      if (existing.length > 0) return { seeded: false };
      try {
        await seedAll(ctx);
      } catch {
        // A concurrent first-open may have seeded first; that is fine.
        const after = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
        if (after.length === 0) throw new Error("Seeding failed. Please reload.");
        return { seeded: false };
      }
      return { seeded: true };
    },
  }),

  login: defineAction({
    description: "Signs in with username and password; returns a session token and the user's role.",
    request: z.object({ username: z.string().min(1), password: z.string().min(1) }),
    response: z.object({
      token: z.string(),
      username: z.string(),
      nameEn: z.string(),
      nameAr: z.string(),
      role: z.string(),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.username, args.username.trim()))
        .limit(1);
      const u = rows[0];
      const hash = await hashPassword(args.password);
      if (!u || u.passwordHash !== hash) throw new Error("Invalid username or password.");
      const token = crypto.randomUUID();
      await db.insert(schema.sessions).values({ token, userId: u.id });
      await audit(db, u.username, "login", "session", u.username, "User signed in.");
      ctx.invalidateQueries();
      return { token, username: u.username, nameEn: u.nameEn, nameAr: u.nameAr, role: u.role };
    },
  }),

  logout: defineAction({
    description: "Ends the current session.",
    request: z.object({ token: z.string() }),
    response: okResponse,
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.delete(schema.sessions).where(eq(schema.sessions.token, args.token));
      return { ok: true };
    },
  }),

  listRows: defineAction({
    description: "Lists rows of a module entity (buildings, allocations, tenders, lands, etc.) with optional text search.",
    request: z.object({
      token: z.string(),
      entity: z.string(),
      search: z.string().default(""),
    }),
    response: z.object({ rows: z.array(scalarRecord) }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const cfg = ENTITIES[args.entity];
      if (!cfg) throw new Error(`Unknown entity: ${args.entity}`);
      const db = ctx.db<typeof schema>();
      let rows = (await cfg.list(db)).map(serialize);
      const q = args.search.trim().toLowerCase();
      if (q) {
        rows = rows.filter((r) =>
          Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(q)),
        );
      }
      return { rows };
    },
  }),

  saveRow: defineAction({
    description: "Creates or updates a row in a module entity, enforcing the caller's role, and writes an audit entry.",
    request: z.object({
      token: z.string(),
      entity: z.string(),
      id: z.number().nullable().default(null),
      values: scalarRecord,
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const user = await requireUser(ctx, args.token);
      const cfg = ENTITIES[args.entity];
      if (!cfg) throw new Error(`Unknown entity: ${args.entity}`);
      requireWrite(user, cfg.writeRoles);
      const db = ctx.db<typeof schema>();
      const values = pickFields(cfg, args.values);
      let id = args.id ?? 0;
      if (args.id) {
        await cfg.update(db, args.id, values);
      } else {
        id = await cfg.insert(db, values);
      }
      const label = String(args.values[cfg.labelField] ?? id);
      await audit(db, user.username, args.id ? "update" : "create", args.entity, label, JSON.stringify(values).slice(0, 300));
      ctx.invalidateQueries();
      return { id };
    },
  }),

  deleteRow: defineAction({
    description: "Deletes a row from a module entity, enforcing the caller's role, and writes an audit entry.",
    request: z.object({ token: z.string(), entity: z.string(), id: z.number() }),
    response: okResponse,
    async handler(ctx, args): Promise<{ ok: true }> {
      const user = await requireUser(ctx, args.token);
      const cfg = ENTITIES[args.entity];
      if (!cfg) throw new Error(`Unknown entity: ${args.entity}`);
      requireWrite(user, cfg.writeRoles);
      const db = ctx.db<typeof schema>();
      await cfg.remove(db, args.id);
      await audit(db, user.username, "delete", args.entity, String(args.id), "");
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getRefs: defineAction({
    description: "Returns all lookup/reference data (governorates, centers, villages, stages, ownership types, buildings, suppliers, tenders, lands, fiscal years, allocations) for forms and labels.",
    request: z.object({ token: z.string() }),
    response: z.object({
      refs: z.record(z.string(), z.array(scalarRecord)),
    }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const db = ctx.db<typeof schema>();
      const grab = async (p: Promise<Array<Record<string, unknown>>>) => (await p).map(serialize);
      const refs: Record<string, Row[]> = {
        governorates: await grab(db.select().from(schema.governorates).orderBy(asc(schema.governorates.id)) as never),
        centers: await grab(db.select().from(schema.centers).orderBy(asc(schema.centers.id)) as never),
        villages: await grab(db.select().from(schema.villages).orderBy(asc(schema.villages.id)) as never),
        stages: await grab(db.select().from(schema.stages).orderBy(asc(schema.stages.id)) as never),
        ownershipTypes: await grab(db.select().from(schema.ownershipTypes).orderBy(asc(schema.ownershipTypes.id)) as never),
        buildings: await grab(db.select({ id: schema.buildings.id, code: schema.buildings.code, nameEn: schema.buildings.nameEn, nameAr: schema.buildings.nameAr }).from(schema.buildings).orderBy(asc(schema.buildings.code)) as never),
        suppliers: await grab(db.select({ id: schema.suppliers.id, nameEn: schema.suppliers.nameEn, nameAr: schema.suppliers.nameAr }).from(schema.suppliers).orderBy(asc(schema.suppliers.id)) as never),
        tenders: await grab(db.select({ id: schema.tenders.id, number: schema.tenders.number, titleEn: schema.tenders.titleEn }).from(schema.tenders).orderBy(desc(schema.tenders.id)) as never),
        lands: await grab(db.select({ id: schema.lands.id, code: schema.lands.code, locationEn: schema.lands.locationEn }).from(schema.lands).orderBy(asc(schema.lands.code)) as never),
        fiscalYears: await grab(db.select().from(schema.fiscalYears).orderBy(asc(schema.fiscalYears.id)) as never),
        allocations: await grab(db.select({ id: schema.allocations.id, chapter: schema.allocations.chapter, item: schema.allocations.item }).from(schema.allocations).orderBy(desc(schema.allocations.id)) as never),
      };
      return { refs };
    },
  }),

  getDashboard: defineAction({
    description: "Returns migration overview stats: legacy analysis totals, subsystem counts, module migration status, and live counts/totals from the modern database.",
    request: z.object({ token: z.string() }),
    response: z.object({
      modules: z.array(z.object({ key: z.string(), status: z.string(), percent: z.number() })),
      counts: scalarRecord,
      recentAudit: z.array(scalarRecord),
      recentJobs: z.array(scalarRecord),
    }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const db = ctx.db<typeof schema>();
      const mods = await db.select().from(schema.moduleStatus);
      const buildings = await db.select({ id: schema.buildings.id }).from(schema.buildings);
      const allocs = await db.select().from(schema.allocations);
      const tenders = await db.select().from(schema.tenders);
      const certs = await db.select().from(schema.certificates);
      const lands = await db.select({ id: schema.lands.id }).from(schema.lands);
      const leases = await db.select().from(schema.leases);
      const estimates = await db.select({ id: schema.estimates.id }).from(schema.estimates);
      const suppliers = await db.select({ id: schema.suppliers.id }).from(schema.suppliers);
      const totalAllocated = allocs.reduce((s, a) => s + a.allocated, 0);
      const totalSpent = allocs.reduce((s, a) => s + a.spent, 0);
      const recentAudit = await db
        .select()
        .from(schema.auditLog)
        .orderBy(desc(schema.auditLog.id))
        .limit(6);
      const recentJobs = await db
        .select()
        .from(schema.migrationJobs)
        .orderBy(desc(schema.migrationJobs.id))
        .limit(3);
      return {
        modules: mods.map((m) => ({ key: m.key, status: m.status, percent: m.percent })),
        counts: {
          buildings: buildings.length,
          allocations: allocs.length,
          totalAllocated,
          totalSpent,
          tenders: tenders.length,
          tendersOpen: tenders.filter((t) => t.status === "open" || t.status === "evaluation").length,
          certificates: certs.length,
          certsPending: certs.filter((c) => c.status === "submitted" || c.status === "draft").length,
          lands: lands.length,
          leasesActive: leases.filter((l) => l.status === "active").length,
          estimates: estimates.length,
          suppliers: suppliers.length,
        },
        recentAudit: recentAudit.map(serialize),
        recentJobs: recentJobs.map(serialize),
      };
    },
  }),

  getCertificates: defineAction({
    description: "Lists payment certificates (technical abstracts) with their line items and computed gross, deductions and net payable.",
    request: z.object({ token: z.string(), search: z.string().default("") }),
    response: z.object({
      certificates: z.array(
        z.object({
          cert: scalarRecord,
          items: z.array(scalarRecord),
          gross: z.number(),
          deductions: z.number(),
          net: z.number(),
        }),
      ),
    }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const db = ctx.db<typeof schema>();
      const certs = await db.select().from(schema.certificates).orderBy(desc(schema.certificates.id));
      const items = await db.select().from(schema.certItems);
      const q = args.search.trim().toLowerCase();
      const out = [];
      for (const c of certs) {
        const cItems = items.filter((i) => i.certId === c.id);
        const gross = cItems.reduce((s, i) => s + i.quantity * i.price, 0);
        const deductions = (gross * c.deductionsPct) / 100;
        const row = {
          cert: serialize(c as unknown as Record<string, unknown>),
          items: cItems.map((i) => serialize(i as unknown as Record<string, unknown>)),
          gross,
          deductions,
          net: gross - deductions,
        };
        if (
          !q ||
          c.certNo.toLowerCase().includes(q) ||
          c.contractor.toLowerCase().includes(q) ||
          c.contractRef.toLowerCase().includes(q)
        )
          out.push(row);
      }
      return { certificates: out };
    },
  }),

  saveCertificate: defineAction({
    description: "Creates or updates a payment certificate together with its line items.",
    request: z.object({
      token: z.string(),
      id: z.number().nullable().default(null),
      values: scalarRecord,
      items: z.array(
        z.object({
          description: z.string(),
          unit: z.string(),
          quantity: z.number(),
          price: z.number(),
        }),
      ),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const user = await requireUser(ctx, args.token);
      requireWrite(user, ["admin", "technical"]);
      const db = ctx.db<typeof schema>();
      const fields = ["certNo", "buildingId", "contractor", "contractRef", "certType", "periodFrom", "periodTo", "deductionsPct", "status"];
      const v: Record<string, unknown> = {};
      for (const f of fields) if (f in args.values) v[f] = args.values[f];
      let id = args.id ?? 0;
      if (args.id) {
        await db.update(schema.certificates).set(v as never).where(eq(schema.certificates.id, args.id));
        await db.delete(schema.certItems).where(eq(schema.certItems.certId, args.id));
      } else {
        const r = await db.insert(schema.certificates).values(v as never).returning({ id: schema.certificates.id });
        id = r[0]?.id ?? 0;
      }
      for (const it of args.items) {
        if (!it.description.trim()) continue;
        await db.insert(schema.certItems).values({
          certId: id, description: it.description, unit: it.unit, quantity: it.quantity, price: it.price,
        });
      }
      await audit(db, user.username, args.id ? "update" : "create", "certificates", String(args.values.certNo ?? id), `${args.items.length} line items`);
      ctx.invalidateQueries();
      return { id };
    },
  }),

  setCertificateStatus: defineAction({
    description: "Moves a payment certificate one step through the workflow draft → submitted → approved → paid.",
    request: z.object({ token: z.string(), id: z.number(), status: z.string() }),
    response: okResponse,
    async handler(ctx, args): Promise<{ ok: true }> {
      const user = await requireUser(ctx, args.token);
      requireWrite(user, ["admin", "technical"]);
      const order = ["draft", "submitted", "approved", "paid"];
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.certificates).where(eq(schema.certificates.id, args.id)).limit(1);
      const cert = rows[0];
      if (!cert) throw new Error("Certificate not found.");
      const cur = order.indexOf(cert.status);
      const next = order.indexOf(args.status);
      if (next === -1 || next !== cur + 1)
        throw new Error(`Cannot move a certificate from ${cert.status} to ${args.status}; the workflow advances one step at a time.`);
      await db
        .update(schema.certificates)
        .set({ status: args.status as typeof cert.status })
        .where(eq(schema.certificates.id, args.id));
      await audit(db, user.username, "status", "certificates", cert.certNo, `${cert.status} → ${args.status}`);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteCertificate: defineAction({
    description: "Deletes a payment certificate and its line items.",
    request: z.object({ token: z.string(), id: z.number() }),
    response: okResponse,
    async handler(ctx, args): Promise<{ ok: true }> {
      const user = await requireUser(ctx, args.token);
      requireWrite(user, ["admin", "technical"]);
      const db = ctx.db<typeof schema>();
      await db.delete(schema.certItems).where(eq(schema.certItems.certId, args.id));
      await db.delete(schema.certificates).where(eq(schema.certificates.id, args.id));
      await audit(db, user.username, "delete", "certificates", String(args.id), "");
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getEstimates: defineAction({
    description: "Lists estimate / BOQ documents with line items and computed totals.",
    request: z.object({ token: z.string(), search: z.string().default("") }),
    response: z.object({
      estimates: z.array(
        z.object({
          estimate: scalarRecord,
          items: z.array(scalarRecord),
          total: z.number(),
        }),
      ),
    }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const db = ctx.db<typeof schema>();
      const ests = await db.select().from(schema.estimates).orderBy(desc(schema.estimates.id));
      const items = await db.select().from(schema.estimateItems);
      const q = args.search.trim().toLowerCase();
      const out = [];
      for (const e of ests) {
        const eItems = items.filter((i) => i.estimateId === e.id);
        const total = eItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        if (!q || e.docNo.toLowerCase().includes(q) || e.projectName.toLowerCase().includes(q))
          out.push({
            estimate: serialize(e as unknown as Record<string, unknown>),
            items: eItems.map((i) => serialize(i as unknown as Record<string, unknown>)),
            total,
          });
      }
      return { estimates: out };
    },
  }),

  saveEstimate: defineAction({
    description: "Creates or updates an estimate / BOQ document together with its line items.",
    request: z.object({
      token: z.string(),
      id: z.number().nullable().default(null),
      values: scalarRecord,
      items: z.array(
        z.object({
          description: z.string(),
          unit: z.string(),
          quantity: z.number(),
          unitPrice: z.number(),
        }),
      ),
    }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const user = await requireUser(ctx, args.token);
      requireWrite(user, ["admin", "technical"]);
      const db = ctx.db<typeof schema>();
      const fields = ["docNo", "buildingId", "projectName", "estType", "status"];
      const v: Record<string, unknown> = {};
      for (const f of fields) if (f in args.values) v[f] = args.values[f];
      let id = args.id ?? 0;
      if (args.id) {
        await db.update(schema.estimates).set(v as never).where(eq(schema.estimates.id, args.id));
        await db.delete(schema.estimateItems).where(eq(schema.estimateItems.estimateId, args.id));
      } else {
        const r = await db.insert(schema.estimates).values(v as never).returning({ id: schema.estimates.id });
        id = r[0]?.id ?? 0;
      }
      for (const it of args.items) {
        if (!it.description.trim()) continue;
        await db.insert(schema.estimateItems).values({
          estimateId: id, description: it.description, unit: it.unit, quantity: it.quantity, unitPrice: it.unitPrice,
        });
      }
      await audit(db, user.username, args.id ? "update" : "create", "estimates", String(args.values.docNo ?? id), `${args.items.length} line items`);
      ctx.invalidateQueries();
      return { id };
    },
  }),

  deleteEstimate: defineAction({
    description: "Deletes an estimate document and its line items.",
    request: z.object({ token: z.string(), id: z.number() }),
    response: okResponse,
    async handler(ctx, args): Promise<{ ok: true }> {
      const user = await requireUser(ctx, args.token);
      requireWrite(user, ["admin", "technical"]);
      const db = ctx.db<typeof schema>();
      await db.delete(schema.estimateItems).where(eq(schema.estimateItems.estimateId, args.id));
      await db.delete(schema.estimates).where(eq(schema.estimates.id, args.id));
      await audit(db, user.username, "delete", "estimates", String(args.id), "");
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getTenderDetail: defineAction({
    description: "Returns one tender with its offers (with supplier names) and related claims.",
    request: z.object({ token: z.string(), tenderId: z.number() }),
    response: z.object({
      tender: scalarRecord,
      offers: z.array(scalarRecord),
      claims: z.array(scalarRecord),
    }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const db = ctx.db<typeof schema>();
      const t = await db.select().from(schema.tenders).where(eq(schema.tenders.id, args.tenderId)).limit(1);
      const tender = t[0];
      if (!tender) throw new Error("Tender not found.");
      const offers = await db.select().from(schema.offers).where(eq(schema.offers.tenderId, args.tenderId));
      const claims = await db.select().from(schema.claims).where(eq(schema.claims.tenderId, args.tenderId));
      return {
        tender: serialize(tender as unknown as Record<string, unknown>),
        offers: offers.map((o) => serialize(o as unknown as Record<string, unknown>)),
        claims: claims.map((c) => serialize(c as unknown as Record<string, unknown>)),
      };
    },
  }),

  getLegacy: defineAction({
    description: "Lists the legacy AS/400 file inventory (searchable, filterable by subsystem) and the field mappings for one selected file.",
    request: z.object({
      token: z.string(),
      search: z.string().default(""),
      subsystem: z.string().default(""),
      fileId: z.number().nullable().default(null),
    }),
    response: z.object({
      files: z.array(scalarRecord),
      mappings: z.array(scalarRecord),
    }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const db = ctx.db<typeof schema>();
      let files = await db.select().from(schema.legacyFiles).orderBy(asc(schema.legacyFiles.member));
      const q = args.search.trim().toLowerCase();
      if (q)
        files = files.filter(
          (f) =>
            f.member.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q) ||
            f.modernTable.toLowerCase().includes(q),
        );
      if (args.subsystem) files = files.filter((f) => f.subsystem === args.subsystem);
      let mappings: Array<Record<string, unknown>> = [];
      if (args.fileId) {
        mappings = (await db
          .select()
          .from(schema.fieldMappings)
          .where(eq(schema.fieldMappings.legacyFileId, args.fileId))
          .orderBy(asc(schema.fieldMappings.id))) as never;
      }
      return {
        files: files.map((f) => serialize(f as unknown as Record<string, unknown>)),
        mappings: mappings.map((m) => serialize(m)),
      };
    },
  }),

  getMigration: defineAction({
    description: "Returns migration job history plus pending staging-row counts for the School Map and Budget ETL runs.",
    request: z.object({ token: z.string() }),
    response: z.object({
      jobs: z.array(scalarRecord),
      staging: scalarRecord,
      stagingRows: z.record(z.string(), z.array(scalarRecord)),
    }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const db = ctx.db<typeof schema>();
      const jobs = await db.select().from(schema.migrationJobs).orderBy(desc(schema.migrationJobs.id)).limit(20);
      const sb = await db.select().from(schema.stagingBuildings).orderBy(asc(schema.stagingBuildings.id));
      const sbu = await db.select().from(schema.stagingBudget).orderBy(asc(schema.stagingBudget.id));
      return {
        jobs: jobs.map((j) => serialize(j as unknown as Record<string, unknown>)),
        staging: {
          buildingsPending: sb.filter((r) => r.loaded === 0).length,
          buildingsLoaded: sb.filter((r) => r.loaded === 1).length,
          budgetPending: sbu.filter((r) => r.loaded === 0).length,
          budgetLoaded: sbu.filter((r) => r.loaded === 1).length,
        },
        stagingRows: {
          buildings: sb.map((r) => serialize(r as unknown as Record<string, unknown>)),
          budget: sbu.map((r) => serialize(r as unknown as Record<string, unknown>)),
        },
      };
    },
  }),

  runMigration: defineAction({
    description: "Runs an ETL migration job for a module (schoolmap or budget): validates staging rows, loads valid rows into the modern tables, rejects invalid ones with messages, and records a job log.",
    request: z.object({ token: z.string(), module: z.enum(["schoolmap", "budget"]) }),
    response: z.object({
      jobId: z.number(),
      rowsRead: z.number(),
      rowsLoaded: z.number(),
      rowsRejected: z.number(),
      messages: z.array(z.string()),
    }),
    async handler(ctx, args) {
      const user = await requireUser(ctx, args.token);
      requireWrite(user, ["admin", "technical", "budget"]);
      if (args.module === "schoolmap" && user.role === "budget")
        throw new Error("Budget officers cannot run the School Map migration.");
      if (args.module === "budget" && user.role === "technical")
        throw new Error("Technical officers cannot run the Budget migration.");
      const db = ctx.db<typeof schema>();
      const messages: string[] = [];
      let read = 0;
      let loaded = 0;
      let rejected = 0;

      if (args.module === "schoolmap") {
        const govs = await db.select().from(schema.governorates);
        const stageRows = await db.select().from(schema.stages);
        const existing = await db.select({ code: schema.buildings.code }).from(schema.buildings);
        const existingCodes = new Set(existing.map((b) => b.code));
        const pending = await db
          .select()
          .from(schema.stagingBuildings)
          .where(eq(schema.stagingBuildings.loaded, 0));
        messages.push(`Extract: read ${pending.length} staging rows from PBLBULDG extract (NEWLIGAEB).`);
        for (const row of pending) {
          read++;
          const gov = govs.find((g) => g.code === row.govCode);
          if (!gov) {
            rejected++;
            messages.push(`REJECT BLCD ${row.blcd}: governorate code '${row.govCode}' not found in reference data.`);
            continue;
          }
          if (existingCodes.has(row.blcd)) {
            rejected++;
            messages.push(`REJECT BLCD ${row.blcd}: building code already exists in modern registry (duplicate).`);
            continue;
          }
          const stage = stageRows.find((s) => s.nameEn === row.stageName);
          await db.insert(schema.buildings).values({
            code: row.blcd, nameEn: row.nameEn, nameAr: row.nameAr,
            governorateId: gov.id, stageId: stage?.id ?? null,
            eduType: "General", plotArea: row.plotArea, classrooms: row.classrooms,
            status: "active",
          });
          await db.update(schema.stagingBuildings).set({ loaded: 1 }).where(eq(schema.stagingBuildings.id, row.id));
          existingCodes.add(row.blcd);
          loaded++;
          messages.push(`LOAD BLCD ${row.blcd}: ${row.nameEn} → buildings (${gov.nameEn}).`);
        }
      } else {
        const govs = await db.select().from(schema.governorates);
        const fys = await db.select().from(schema.fiscalYears);
        const pending = await db
          .select()
          .from(schema.stagingBudget)
          .where(eq(schema.stagingBudget.loaded, 0));
        messages.push(`Extract: read ${pending.length} staging rows from CBABDALW extract (BALANC5).`);
        for (const row of pending) {
          read++;
          if (row.amount <= 0) {
            rejected++;
            messages.push(`REJECT ${row.lwyear}/${row.lwtas} '${row.item}': amount ${row.amount} is not positive (legacy packed-decimal sign error).`);
            continue;
          }
          const gov = govs.find((g) => g.code === row.govCode);
          if (!gov) {
            rejected++;
            messages.push(`REJECT ${row.lwyear}/${row.lwtas} '${row.item}': governorate code '${row.govCode}' not found.`);
            continue;
          }
          const fy = fys.find((f) => f.year.startsWith(row.lwyear));
          const chapter =
            row.lwtas === "06"
              ? "Chapter 6 — Investments (الباب السادس: الاستثمارات)"
              : row.lwtas === "02"
                ? "Chapter 2 — Goods & Services (الباب الثاني: السلع والخدمات)"
                : `Chapter ${row.lwtas}`;
          await db.insert(schema.allocations).values({
            fiscalYearId: fy?.id ?? null, chapter, item: row.item,
            governorateId: gov.id, allocated: row.amount, spent: 0,
          });
          await db.update(schema.stagingBudget).set({ loaded: 1 }).where(eq(schema.stagingBudget.id, row.id));
          loaded++;
          messages.push(`LOAD ${row.lwyear}/${row.lwtas} '${row.item}' → allocations (${gov.nameEn}, EGP ${row.amount.toLocaleString("en-US")}).`);
        }
      }

      messages.push(`Transform & load complete: ${loaded} loaded, ${rejected} rejected of ${read} read.`);
      const job = await db
        .insert(schema.migrationJobs)
        .values({
          module: args.module,
          status: rejected > 0 ? "completed_with_rejects" : "completed",
          rowsRead: read, rowsLoaded: loaded, rowsRejected: rejected,
          messages: JSON.stringify(messages), startedBy: user.username,
        })
        .returning({ id: schema.migrationJobs.id });
      const jobId = job[0]?.id ?? 0;

      // Advance module migration progress as rows land.
      const modKey = args.module === "schoolmap" ? "schoolmap" : "budget";
      const ms = await db.select().from(schema.moduleStatus).where(eq(schema.moduleStatus.key, modKey)).limit(1);
      const cur = ms[0];
      if (cur && loaded > 0) {
        const next = Math.min(100, cur.percent + loaded * 4);
        await db
          .update(schema.moduleStatus)
          .set({ percent: next, status: next >= 100 ? "migrated" : "in_progress" })
          .where(eq(schema.moduleStatus.key, modKey));
      }
      await audit(db, user.username, "migration", args.module, `Job #${jobId}`, `${loaded} loaded, ${rejected} rejected of ${read} read.`);
      ctx.invalidateQueries();
      return { jobId, rowsRead: read, rowsLoaded: loaded, rowsRejected: rejected, messages };
    },
  }),

  getAudit: defineAction({
    description: "Returns the most recent audit-log entries (logins, creates, updates, deletes, status changes, migration runs).",
    request: z.object({ token: z.string(), limit: z.number().int().positive().max(200).default(50) }),
    response: z.object({ entries: z.array(scalarRecord) }),
    async handler(ctx, args) {
      await requireUser(ctx, args.token);
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.auditLog)
        .orderBy(desc(schema.auditLog.id))
        .limit(args.limit);
      return { entries: rows.map((r) => serialize(r as unknown as Record<string, unknown>)) };
    },
  }),
} satisfies ActionsModule;
