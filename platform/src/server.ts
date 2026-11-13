import express from "express";
import { pool, audit } from "./db.js";
import { verifyPassword, newSessionToken, sessionKey, SESSION_TTL_MS, can, type Role, type Session } from "./auth.js";
import { money, moneyOut, certificateTotals, type Deduction } from "./money.js";
import { certTransition, tenderTransition, estimateTransition, recordDecree, type CertStatus, type TenderStage, type EstimateStatus, type ExpropriationCase } from "./workflow.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
const PORT = Number(process.env.PORT || 8080);

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "missing session token" });
  const { rows } = await pool.query(
    "SELECT s.user_id, u.role, s.expires_at FROM app.sessions s JOIN app.users u ON u.id = s.user_id WHERE s.token_key = $1 AND NOT s.revoked",
    [sessionKey(token)]);
  if (!rows.length || new Date(rows[0].expires_at) < new Date())
    return res.status(401).json({ error: "session expired or revoked" });
  (req as any).session = { userId: rows[0].user_id, role: rows[0].role as Role, expiresAt: rows[0].expires_at } as Session;
  next();
}
function requirePerm(perm: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const s = (req as any).session as Session;
    if (!can(s.role, perm)) return res.status(403).json({ error: `role ${s.role} lacks permission ${perm}` });
    next();
  };
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "gaeb-platform" }));

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  const { rows } = await pool.query("SELECT id, password_hash, role FROM app.users WHERE username = $1 AND is_active", [username]);
  if (!rows.length || !verifyPassword(String(password ?? ""), rows[0].password_hash))
    return res.status(401).json({ error: "invalid credentials" });
  const token = newSessionToken();
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query("INSERT INTO app.sessions (token_key, user_id, expires_at) VALUES ($1,$2,$3)", [sessionKey(token), rows[0].id, expires]);
  await audit(rows[0].id, "login", "session", String(rows[0].id));
  res.json({ token, expiresAt: expires.toISOString(), role: rows[0].role });
});
app.post("/api/logout", requireAuth, async (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  await pool.query("UPDATE app.sessions SET revoked = TRUE WHERE token_key = $1", [sessionKey(token)]);
  res.json({ ok: true });
});
app.get("/api/governorates", requireAuth, async (_req, res) => {
  const { rows } = await pool.query("SELECT code, name_en, name_ar, regional_center FROM app.governorates ORDER BY code");
  res.json(rows);
});
app.get("/api/buildings", requireAuth, requirePerm("buildings.read"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const { rows } = await pool.query("SELECT * FROM app.buildings ORDER BY id LIMIT $1", [limit]);
  res.json(rows.map(r => ({ ...r, plot_area: String(r.plot_area), building_area: String(r.building_area) })));
});
app.post("/api/buildings", requireAuth, requirePerm("buildings.write"), async (req, res) => {
  const b = req.body ?? {};
  const { rows } = await pool.query(
    `INSERT INTO app.buildings (legacy_blcd, name_en, name_ar, governorate_code, center_code, village_code, stage_code, plot_area, building_area, floors, classrooms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [b.legacy_blcd ?? null, b.name_en ?? "", b.name_ar ?? "", b.governorate_code ?? null, b.center_code ?? null,
     b.village_code ?? null, b.stage_code ?? null, money(String(b.plot_area ?? "0")).toString(), money(String(b.building_area ?? "0")).toString(),
     b.floors ?? 0, b.classrooms ?? 0]);
  await audit((req as any).session.userId, "create", "building", String(rows[0].id));
  res.status(201).json({ id: rows[0].id });
});
// Certificates: valuation is computed server-side with exact decimals; the client never supplies totals.
app.post("/api/certificates", requireAuth, requirePerm("certificates.certify"), async (req, res) => {
  const { building_id, kind, items, deductions } = req.body ?? {};
  const lines = (items ?? []).map((i: any) => ({ qty: money(String(i.qty)), price: money(String(i.price)) }));
  const deds: Deduction[] = (deductions ?? []).map((d: any) => ({
    kind: d.kind, percent: d.percent != null ? money(String(d.percent)) : undefined,
    amount: d.amount != null ? money(String(d.amount)) : undefined }));
  let totals;
  try { totals = certificateTotals(lines, deds); } catch (e: any) { return res.status(422).json({ error: e.message }); }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "INSERT INTO app.certificates (building_id, kind, gross, deductions, net) VALUES ($1,$2,$3,$4,$5) RETURNING id",
      [building_id ?? null, kind ?? "construction", totals.gross.toString(), totals.totalDeductions.toString(), totals.net.toString()]);
    const id = rows[0].id;
    for (let i = 0; i < lines.length; i++) {
      const it = items[i];
      await client.query("INSERT INTO app.certificate_items (certificate_id, description, unit, qty, price, value) VALUES ($1,$2,$3,$4,$5,$6)",
        [id, it.description ?? "", it.unit ?? "", lines[i].qty.toString(), lines[i].price.toString(), totals.lineValues[i].toString()]);
    }
    await client.query("COMMIT");
    await audit((req as any).session.userId, "create", "certificate", String(id),
      { gross: moneyOut(totals.gross), net: moneyOut(totals.net) });
    res.status(201).json({ id, gross: moneyOut(totals.gross), deductions: moneyOut(totals.totalDeductions), net: moneyOut(totals.net) });
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
});
app.post("/api/certificates/:id/transition", requireAuth, async (req, res) => {
  const s = (req as any).session as Session;
  const { rows } = await pool.query("SELECT status FROM app.certificates WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "certificate not found" });
  try {
    certTransition(rows[0].status as CertStatus, req.body.to as CertStatus, s.role, { paymentRef: req.body.payment_ref });
  } catch (e: any) { return res.status(422).json({ error: e.message }); }
  await pool.query("UPDATE app.certificates SET status = $2, payment_ref = COALESCE($3, payment_ref) WHERE id = $1",
    [req.params.id, req.body.to, req.body.payment_ref ?? null]);
  await audit(s.userId, "transition", "certificate", req.params.id, { to: req.body.to });
  res.json({ ok: true });
});

app.get("/api/certificates", requireAuth, requirePerm("certificates.read"), async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const { rows } = await pool.query("SELECT id, building_id, kind, status, gross, deductions, net, payment_ref FROM app.certificates ORDER BY id DESC LIMIT $1", [limit]);
  res.json(rows.map(r => ({ ...r, gross: String(r.gross), deductions: String(r.deductions), net: String(r.net) })));
});
// Item catalogue (PMPITMAR): estimates may only draw lines from here.
app.get("/api/catalogue", requireAuth, async (_req, res) => {
  const { rows } = await pool.query("SELECT id, code, name_en, name_ar, unit, standard_price FROM app.item_catalogue WHERE is_active ORDER BY code");
  res.json(rows.map(r => ({ ...r, standard_price: String(r.standard_price) })));
});
app.post("/api/catalogue", requireAuth, requirePerm("estimates.write"), async (req, res) => {
  const b = req.body ?? {};
  const { rows } = await pool.query(
    "INSERT INTO app.item_catalogue (code, name_en, name_ar, unit, standard_price) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [b.code, b.name_en ?? "", b.name_ar ?? "", b.unit ?? "", money(String(b.standard_price)).toString()]);
  await audit((req as any).session.userId, "create", "catalogue_item", String(rows[0].id));
  res.status(201).json({ id: rows[0].id });
});
// Estimates: creation snapshots catalogue prices; totals computed server-side, exact decimals.
app.post("/api/estimates", requireAuth, requirePerm("estimates.write"), async (req, res) => {
  const { building_id, title, items } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) return res.status(422).json({ error: "an estimate needs at least one catalogue line" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query("INSERT INTO app.estimates (building_id, title, created_by) VALUES ($1,$2,$3) RETURNING id",
      [building_id ?? null, title ?? "", (req as any).session.userId]);
    const id = rows[0].id;
    let total = money("0");
    for (const it of items) {
      const cat = await client.query("SELECT standard_price FROM app.item_catalogue WHERE id = $1 AND is_active", [it.catalogue_item_id]);
      if (!cat.rows.length) { await client.query("ROLLBACK"); return res.status(422).json({ error: `catalogue item ${it.catalogue_item_id} not found or inactive — estimates are catalogue-only` }); }
      const qty = money(String(it.qty));
      const value = qty.mul(cat.rows[0].standard_price);
      total = total.plus(value);
      await client.query("INSERT INTO app.estimate_items (estimate_id, catalogue_item_id, qty, price, value) VALUES ($1,$2,$3,$4,$5)",
        [id, it.catalogue_item_id, qty.toString(), String(cat.rows[0].standard_price), value.toString()]);
    }
    await client.query("UPDATE app.estimates SET total = $2 WHERE id = $1", [id, total.toString()]);
    await client.query("INSERT INTO app.estimate_revisions (estimate_id, revision, total, changed_by, note) VALUES ($1,1,$2,$3,'created')",
      [id, total.toString(), (req as any).session.userId]);
    await client.query("COMMIT");
    await audit((req as any).session.userId, "create", "estimate", String(id), { total: moneyOut(total) });
    res.status(201).json({ id, total: moneyOut(total), status: "draft", revision: 1 });
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
});
app.get("/api/estimates", requireAuth, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 200);
  const { rows } = await pool.query("SELECT id, building_id, title, status, revision, total FROM app.estimates ORDER BY id DESC LIMIT $1", [limit]);
  res.json(rows.map(r => ({ ...r, total: String(r.total) })));
});
app.post("/api/estimates/:id/transition", requireAuth, async (req, res) => {
  const s = (req as any).session as Session;
  const { rows } = await pool.query("SELECT status, revision, total FROM app.estimates WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "estimate not found" });
  const from = rows[0].status as EstimateStatus, to = req.body.to as EstimateStatus;
  try { estimateTransition(from, to, s.role); } catch (e: any) { return res.status(422).json({ error: e.message }); }
  if (from === "reviewed" && to === "draft") {
    await pool.query("UPDATE app.estimates SET status = 'draft', revision = revision + 1, reviewed_by = NULL WHERE id = $1", [req.params.id]);
    await pool.query("INSERT INTO app.estimate_revisions (estimate_id, revision, total, changed_by, note) VALUES ($1,$2,$3,$4,'returned for correction')",
      [req.params.id, rows[0].revision + 1, rows[0].total, s.userId]);
  } else if (to === "reviewed") {
    await pool.query("UPDATE app.estimates SET status = 'reviewed', reviewed_by = $2 WHERE id = $1", [req.params.id, s.userId]);
  } else if (to === "approved") {
    await pool.query("UPDATE app.estimates SET status = 'approved', approved_by = $2 WHERE id = $1", [req.params.id, s.userId]);
  }
  await audit(s.userId, "transition", "estimate", req.params.id, { from, to });
  res.json({ ok: true });
});

// Budget allocations (operational view over the Budget module; full posting logic awaits B-01 evidence).
app.get("/api/budget", requireAuth, requirePerm("budget.read"), async (_req, res) => {
  const { rows } = await pool.query("SELECT id, fiscal_year, chapter, item, governorate_code, allocated, committed, spent FROM app.budget_allocations ORDER BY fiscal_year DESC, chapter, item");
  res.json(rows.map(r => ({ ...r, allocated: String(r.allocated), committed: String(r.committed), spent: String(r.spent),
    available: money(String(r.allocated)).minus(String(r.committed)).minus(String(r.spent)).toString() })));
});
app.post("/api/budget", requireAuth, requirePerm("budget.write"), async (req, res) => {
  const b = req.body ?? {};
  const { rows } = await pool.query(
    "INSERT INTO app.budget_allocations (fiscal_year, chapter, item, governorate_code, allocated) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    [b.fiscal_year, b.chapter, b.item, b.governorate_code ?? null, money(String(b.allocated ?? "0")).toString()]);
  await audit((req as any).session.userId, "create", "budget_allocation", String(rows[0].id));
  res.status(201).json({ id: rows[0].id });
});
// Tenders: creation + stage advancement through the enforced stage machine.
app.get("/api/tenders", requireAuth, requirePerm("tenders.read"), async (_req, res) => {
  const { rows } = await pool.query("SELECT id, legacy_type, legacy_no, title, stage FROM app.tenders ORDER BY id DESC");
  res.json(rows);
});
app.post("/api/tenders", requireAuth, requirePerm("tenders.write"), async (req, res) => {
  const b = req.body ?? {};
  const { rows } = await pool.query("INSERT INTO app.tenders (legacy_type, legacy_no, title) VALUES ($1,$2,$3) RETURNING id",
    [b.legacy_type ?? null, b.legacy_no ?? null, b.title ?? ""]);
  await audit((req as any).session.userId, "create", "tender", String(rows[0].id));
  res.status(201).json({ id: rows[0].id, stage: "draft" });
});
app.post("/api/tenders/:id/transition", requireAuth, async (req, res) => {
  const s = (req as any).session as Session;
  const { rows } = await pool.query("SELECT stage FROM app.tenders WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "tender not found" });
  try { tenderTransition(rows[0].stage as TenderStage, req.body.to as TenderStage, s.role); }
  catch (e: any) { return res.status(422).json({ error: e.message }); }
  await pool.query("UPDATE app.tenders SET stage = $2 WHERE id = $1", [req.params.id, req.body.to]);
  await audit(s.userId, "transition", "tender", req.params.id, { to: req.body.to });
  res.json({ ok: true });
});
// Real estate: expropriation cases + the decree gate (REMV01 -> REMV02).
app.get("/api/realestate/cases", requireAuth, requirePerm("realestate.read"), async (_req, res) => {
  const { rows } = await pool.query("SELECT id, building_id, stage, decree_no, decree_date, gazette_no, compensation FROM app.expropriation_cases ORDER BY id DESC");
  res.json(rows.map(r => ({ ...r, compensation: r.compensation == null ? null : String(r.compensation) })));
});
app.post("/api/realestate/cases", requireAuth, requirePerm("realestate.write"), async (req, res) => {
  const b = req.body ?? {};
  const { rows } = await pool.query("INSERT INTO app.expropriation_cases (building_id, compensation) VALUES ($1,$2) RETURNING id",
    [b.building_id ?? null, b.compensation != null ? money(String(b.compensation)).toString() : null]);
  await audit((req as any).session.userId, "create", "expropriation_case", String(rows[0].id));
  res.status(201).json({ id: rows[0].id, stage: "pre_decree" });
});
app.post("/api/realestate/cases/:id/decree", requireAuth, requirePerm("realestate.approve"), async (req, res) => {
  const s = (req as any).session as Session;
  const { rows } = await pool.query("SELECT stage, decree_no, decree_date, gazette_no FROM app.expropriation_cases WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "case not found" });
  const current: ExpropriationCase = { stage: rows[0].stage, decreeNo: rows[0].decree_no ?? undefined,
    decreeDate: rows[0].decree_date ? String(rows[0].decree_date) : undefined, gazetteNo: rows[0].gazette_no ?? undefined };
  let updated: ExpropriationCase;
  try { updated = recordDecree(current, req.body.decree_no, req.body.decree_date, req.body.gazette_no); }
  catch (e: any) { return res.status(422).json({ error: e.message }); }
  await pool.query("UPDATE app.expropriation_cases SET stage = 'post_decree', decree_no = $2, decree_date = $3, gazette_no = $4 WHERE id = $1",
    [req.params.id, updated.decreeNo, updated.decreeDate, updated.gazetteNo]);
  await audit(s.userId, "record_decree", "expropriation_case", req.params.id, { decreeNo: updated.decreeNo });
  res.json({ ok: true, stage: updated.stage });
});

// Reports: aggregates run in SQL over NUMERIC columns and return as strings —
// figures reconcile to the underlying records by construction (Directive §11).
app.get("/api/reports/budget-utilization", requireAuth, requirePerm("reports.finance"), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT fiscal_year, COUNT(*)::int AS lines, SUM(allocated) AS allocated, SUM(committed) AS committed, SUM(spent) AS spent,
            SUM(allocated - committed - spent) AS available
     FROM app.budget_allocations GROUP BY fiscal_year ORDER BY fiscal_year DESC`);
  res.json(rows.map(r => ({ ...r, allocated: String(r.allocated), committed: String(r.committed), spent: String(r.spent), available: String(r.available) })));
});
app.get("/api/reports/budget-utilization.csv", requireAuth, requirePerm("reports.finance"), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT fiscal_year, SUM(allocated) AS allocated, SUM(committed) AS committed, SUM(spent) AS spent, SUM(allocated - committed - spent) AS available
     FROM app.budget_allocations GROUP BY fiscal_year ORDER BY fiscal_year DESC`);
  const csv = ["fiscal_year,allocated,committed,spent,available",
    ...rows.map(r => [r.fiscal_year, r.allocated, r.committed, r.spent, r.available].join(","))].join("\n");
  res.type("text/csv").send(csv);
});
app.get("/api/reports/certificates-summary", requireAuth, requirePerm("reports.finance"), async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT status, COUNT(*)::int AS count, SUM(gross) AS gross, SUM(deductions) AS deductions, SUM(net) AS net
     FROM app.certificates GROUP BY status ORDER BY status`);
  res.json(rows.map(r => ({ ...r, gross: String(r.gross), deductions: String(r.deductions), net: String(r.net) })));
});
app.get("/api/reports/buildings-by-governorate", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT g.code, g.name_en, g.name_ar, COUNT(b.id)::int AS buildings
     FROM app.governorates g LEFT JOIN app.buildings b ON b.governorate_code = g.code
     GROUP BY g.code, g.name_en, g.name_ar ORDER BY buildings DESC, g.code`);
  res.json(rows);
});
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(JSON.stringify({ level: "error", message: String(err?.message || err) }));
  res.status(500).json({ error: "internal error" });
});

// ---------------- Migration Center (Phase 3) ----------------
// Real endpoints over the migration engine: preview (decode only), import (full
// pipeline on one connection), batches, quarantine, audited reject resubmission,
// approval-gated transforms, approvals register, legacy inventory.
import { importFixedWidth, validateLayout, type Layout } from "./migration/engine.js";
import { persistImport, loadJobState } from "./migration/load.js";
import { TRANSFORMS, runTransform } from "./migration/transform.js";
import { readFileSync as rf2 } from "node:fs";
const PBL_LAYOUT: Layout = { recordLength: 58, fields: [
  { name: "BECD", type: "char", length: 2, encoding: "utf8" }, { name: "BLRD", type: "char", length: 2, encoding: "utf8" },
  { name: "BLCD", type: "char", length: 7, encoding: "utf8", key: true },
  { name: "SHNM", type: "char", length: 40, encoding: "ibm420" }, { name: "VGCD", type: "zoned", length: 7, decimals: 0 } ] };
const MIG_LAYOUTS: Record<string, { layout: Layout; table: string }> = { pblbuldg: { layout: PBL_LAYOUT, table: "school_map.pblbuldg" } };
app.get("/api/migration/inventory", requireAuth, requirePerm("migration.run"), async (_req, res) => {
  try { res.json(JSON.parse(rf2(new URL("../../assets/inventory.json", import.meta.url), "utf8"))); }
  catch { res.status(500).json({ error: "inventory asset unavailable" }); }
});
app.post("/api/migration/preview", requireAuth, requirePerm("migration.run"), express.raw({ type: "application/octet-stream", limit: "64mb" }), async (req, res) => {
  const entry = MIG_LAYOUTS[String(req.query.layout ?? "pblbuldg")];
  if (!entry) return res.status(400).json({ error: "unknown layout" });
  try { validateLayout(entry.layout); } catch (e: any) { return res.status(422).json({ error: String(e.message) }); }
  const { createHash } = await import("node:crypto");
  const batchId = `mig-${createHash("sha256").update(req.body as Buffer).digest("hex").slice(0, 16)}`;
  const { records, report } = importFixedWidth(req.body as Buffer, entry.layout, { batchId, nextOffset: 0, loadedKeys: [] });
  res.json({ preview: records.slice(0, 25).map(r => r.values), ...report });
});
app.post("/api/migration/import", requireAuth, requirePerm("migration.run"), express.raw({ type: "application/octet-stream", limit: "64mb" }), async (req, res) => {
  const entry = MIG_LAYOUTS[String(req.query.layout ?? "pblbuldg")];
  if (!entry) return res.status(400).json({ error: "unknown layout" });
  const client = await pool.connect();
  try {
    const { createHash } = await import("node:crypto");
    const data = req.body as Buffer;
    const batchId = `mig-${createHash("sha256").update(data).digest("hex").slice(0, 16)}`;
    const db = { query: (t: string, v?: unknown[]) => client.query(t, v as any) };
    const state = await loadJobState(db, batchId);
    const { records, report, state: newState } = importFixedWidth(data, entry.layout, state);
    const persisted = await persistImport(db, entry.table, "ui-upload", String(req.query.layout), records, report, newState, { dataClass: req.query.dataClass === "customer" ? "customer" : "synthetic", importedByUserId: (req as any).session.userId });
    const staged = await client.query(`SELECT COUNT(*)::int n FROM ${entry.table} WHERE _batch_id = $1`, [batchId]);
    await audit((req as any).session.userId, "migration.import", "batch", batchId, { loaded: report.loaded, rejected: report.rejected.length });
    res.json({ ...report, alreadyRecorded: persisted.alreadyRecorded, stagedRowsForBatch: staged.rows[0].n });
  } catch (e: any) { res.status(422).json({ error: String(e.message || e) }); }
  finally { client.release(); }
});
app.get("/api/migration/batches", requireAuth, requirePerm("migration.run"), async (_req, res) => {
  const r = await pool.query(`SELECT b.batch_id, b.source_file, b.layout_name, b.total_records, b.loaded, b.rejected, b.started_at,
    (SELECT json_object_agg(field || ':' || kind, amount) FROM mig.batch_totals t WHERE t.batch_id = b.batch_id) AS totals
    FROM mig.batches b ORDER BY b.started_at DESC LIMIT 100`);
  res.json(r.rows);
});
app.get("/api/migration/batches/:id/rejects", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const r = await pool.query("SELECT id, record_offset, reason, raw_hex, resubmitted_batch FROM mig.rejects WHERE batch_id = $1 ORDER BY record_offset", [req.params.id]);
  res.json(r.rows);
});
app.post("/api/migration/rejects/:id/resubmit", requireAuth, requirePerm("migration.run"), async (req, res) => {
  // Auditable correction flow (buildings layout): the operator supplies corrected field
  // values; the original reject stays on record, the corrected row enters staging under
  // a resubmission batch, and mig.rejects.resubmitted_batch links the two forever.
  const v = (req.body ?? {}).values as Record<string, string> | undefined;
  if (!v?.BLCD || !v?.SHNM || !v?.VGCD) return res.status(400).json({ error: "corrected values must include BLCD, SHNM, VGCD" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const rj = await client.query("SELECT batch_id, record_offset FROM mig.rejects WHERE id = $1 FOR UPDATE", [req.params.id]);
    if (!rj.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ error: "reject not found" }); }
    const newBatch = `mig-resubmit-${req.params.id}`;
    await client.query(`INSERT INTO school_map.pblbuldg (becd, blrd, blcd, shnm, vgcd, _batch_id, _source_offset, _raw_hex)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'resubmitted') ON CONFLICT (_batch_id, _source_offset) DO NOTHING`,
      [v.BECD ?? "", v.BLRD ?? "", v.BLCD, v.SHNM, v.VGCD, newBatch, rj.rows[0].record_offset]);
    await client.query("UPDATE mig.rejects SET resubmitted_batch = $1 WHERE id = $2", [newBatch, req.params.id]);
    await client.query("COMMIT");
    await audit((req as any).session.userId, "migration.reject.resubmit", "reject", String(req.params.id), { newBatch, values: v });
    res.json({ ok: true, resubmittedBatch: newBatch });
  } catch (e: any) { await client.query("ROLLBACK"); res.status(422).json({ error: String(e.message || e) }); }
  finally { client.release(); }
});
app.get("/api/migration/approvals", requireAuth, requirePerm("migration.run"), async (_req, res) => {
  const r = await pool.query("SELECT legacy_member, legacy_field, target_column, transform_name, transform_hash, approved_by, evidence_ref, approved_at FROM mig.mapping_approvals ORDER BY transform_name, legacy_field");
  res.json(r.rows);
});
app.post("/api/migration/approvals", requireAuth, requirePerm("migration.approve"), async (req, res) => {
  // Identity-bound approval: the approver is the authenticated session user — there is
  // no name field to declare. Requires the migration.approve grant (admin/budget),
  // which the migration operator role (technical) deliberately does NOT hold.
  const spec = TRANSFORMS[String((req.body ?? {}).transform)];
  const mode = (req.body ?? {}).mode === "customer" ? "customer" : "demo";
  const evidence = String((req.body ?? {}).evidenceRef ?? "");
  if (!spec) return res.status(400).json({ error: "unknown transform" });
  if (mode === "customer" && !evidence) return res.status(400).json({ error: "customer-data approvals require an evidence reference (signed mapping review)" });
  const s = (req as any).session; const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [spec.name]);
    const { transformHash } = await import("./migration/transform.js");
    const hash = transformHash(spec);
    for (const f of spec.fields) {
      await client.query(`INSERT INTO mig.mapping_approvals (legacy_member, legacy_field, target_table, target_column, transform_name, transform_hash, approved_by, approved_by_user_id, approved_role, mode, status, evidence_ref)
        VALUES ($1,$2,'app',$3,$4,$5,$6,$7,$8,$9,'active',$10)
        ON CONFLICT (legacy_member, legacy_field, transform_name) DO UPDATE SET transform_hash = EXCLUDED.transform_hash,
          approved_by = EXCLUDED.approved_by, approved_by_user_id = EXCLUDED.approved_by_user_id, approved_role = EXCLUDED.approved_role,
          mode = EXCLUDED.mode, status = 'active', evidence_ref = EXCLUDED.evidence_ref, approved_at = now(),
          revoked_by_user_id = NULL, revoked_at = NULL, revoke_reason = NULL`,
        [spec.legacyMember, f.legacy, f.target, spec.name, hash, s.username ?? String(s.userId), s.userId, s.role, mode, evidence]);
      await client.query("INSERT INTO mig.mapping_approval_events (transform_name, legacy_member, legacy_field, event, actor_user_id, actor_role, transform_hash, evidence_ref) VALUES ($1,$2,$3,'approved',$4,$5,$6,$7)",
        [spec.name, spec.legacyMember, f.legacy, s.userId, s.role, hash, evidence]);
    }
    await client.query("COMMIT");
    await audit(s.userId, "migration.approve", spec.name, mode, { evidence });
    res.json({ ok: true, transform: spec.name, mode, fields: spec.fields.length });
  } catch (e: any) { await client.query("ROLLBACK"); res.status(422).json({ error: String(e.message || e) }); }
  finally { client.release(); }
});
app.post("/api/migration/approvals/revoke", requireAuth, requirePerm("migration.approve"), async (req, res) => {
  const spec = TRANSFORMS[String((req.body ?? {}).transform)];
  const reason = String((req.body ?? {}).reason ?? "");
  if (!spec || !reason) return res.status(400).json({ error: "transform and revocation reason are required" });
  const s = (req as any).session; const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [spec.name]);
    await client.query("UPDATE mig.mapping_approvals SET status = 'revoked', revoked_by_user_id = $1, revoked_at = now(), revoke_reason = $2 WHERE transform_name = $3",
      [s.userId, reason, spec.name]);
    for (const f of spec.fields)
      await client.query("INSERT INTO mig.mapping_approval_events (transform_name, legacy_member, legacy_field, event, actor_user_id, actor_role, evidence_ref) VALUES ($1,$2,$3,'revoked',$4,$5,$6)",
        [spec.name, spec.legacyMember, f.legacy, s.userId, s.role, reason]);
    await client.query("COMMIT");
    await audit(s.userId, "migration.approve.revoke", spec.name, "", { reason });
    res.json({ ok: true });
  } catch (e: any) { await client.query("ROLLBACK"); res.status(422).json({ error: String(e.message || e) }); }
  finally { client.release(); }
});
app.post("/api/migration/transform", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const spec = TRANSFORMS[String((req.body ?? {}).name)];
  const batchId = String((req.body ?? {}).batchId ?? "");
  if (!spec || !batchId) return res.status(400).json({ error: "transform name and batchId are required" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [spec.name]); // approval/execution concurrency guard
    const b = await client.query("SELECT data_class FROM mig.batches WHERE batch_id = $1", [batchId]);
    if (!b.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ error: "batch not found" }); }
    const mode = b.rows[0].data_class === "customer" ? "customer" : "demo";
    const inserted = await runTransform({ query: (t: string, v?: unknown[]) => client.query(t, v as any) }, spec, batchId, mode);
    await client.query("COMMIT");
    await audit((req as any).session.userId, "migration.transform", spec.name, batchId, { inserted, mode });
    res.json({ ok: true, inserted, mode });
  } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); res.status(422).json({ error: String(e.message || e) }); }
  finally { client.release(); }
});


// ---------------- Large-file uploads (Directive §4) ----------------
// Uploads stream to controlled temp storage — request bodies are never buffered in
// memory. SHA-256 is computed while streaming; the size cap is enforced mid-stream
// (default 512 MB, env MIG_MAX_UPLOAD_MB). Files land 0600 in MIG_UPLOAD_DIR and are
// deleted after import unless the operator explicitly retains them.
import { createWriteStream, createReadStream as crs } from "node:fs";
import { mkdir, stat as fsStat, unlink } from "node:fs/promises";
import { randomUUID, createHash as ch2 } from "node:crypto";
import { streamImportFile } from "./migration/stream.js";
const UPLOAD_DIR = process.env.MIG_UPLOAD_DIR ?? new URL("../uploads", import.meta.url).pathname;
const MAX_UPLOAD = Number(process.env.MIG_MAX_UPLOAD_MB ?? 512) * 1024 * 1024;
const uploads = new Map<string, { path: string; size: number; sha256: string; by: number }>();
app.post("/api/migration/uploads", requireAuth, requirePerm("migration.run"), async (req, res) => {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const id = randomUUID(); const path = `${UPLOAD_DIR}/${id}.bin`;
  const ws = createWriteStream(path, { mode: 0o600 });
  const h = ch2("sha256"); let size = 0; let aborted = false;
  req.on("data", (c: Buffer) => { size += c.length; h.update(c);
    if (size > MAX_UPLOAD && !aborted) { aborted = true; req.destroy(); ws.destroy(); unlink(path).catch(() => {});
      if (!res.headersSent) res.status(413).json({ error: `upload exceeds the ${MAX_UPLOAD} byte limit — file deleted; split the extract or raise MIG_MAX_UPLOAD_MB` }); } });
  req.pipe(ws);
  ws.on("finish", () => { if (aborted) return;
    uploads.set(id, { path, size, sha256: h.digest("hex"), by: (req as any).session.userId });
    res.json({ uploadId: id, size, sha256: uploads.get(id)!.sha256 }); });
  ws.on("error", (e) => { if (!res.headersSent) res.status(500).json({ error: String(e.message) }); });
});
app.post("/api/migration/uploads/:id/import", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const up = uploads.get(req.params.id);
  if (!up) return res.status(404).json({ error: "upload not found (already imported or expired)" });
  const entry = MIG_LAYOUTS[String(req.query.layout ?? "pblbuldg")];
  if (!entry) return res.status(400).json({ error: "unknown layout" });
  const client = await pool.connect();
  try {
    const db = { query: (t: string, v?: unknown[]) => client.query(t, v as any) };
    const r = await streamImportFile(db, up.path, entry.layout, { table: entry.table, layoutName: String(req.query.layout ?? "pblbuldg"),
      dataClass: req.query.dataClass === "customer" ? "customer" : "synthetic", importedByUserId: (req as any).session.userId });
    await audit((req as any).session.userId, "migration.import.stream", r.batchId, "", { totalRecords: r.totalRecords, chunks: r.chunksCommitted });
    if (req.query.retain !== "1") { await unlink(up.path).catch(() => {}); uploads.delete(req.params.id); }
    res.json(r);
  } catch (e: any) { res.status(422).json({ error: String(e.message || e) }); }
  finally { client.release(); }
});

app.listen(PORT, () => console.log(JSON.stringify({ level: "info", message: `gaeb-platform listening on ${PORT}` })));
