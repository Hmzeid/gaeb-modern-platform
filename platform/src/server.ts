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
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(JSON.stringify({ level: "error", message: String(err?.message || err) }));
  res.status(500).json({ error: "internal error" });
});
app.listen(PORT, () => console.log(JSON.stringify({ level: "info", message: `gaeb-platform listening on ${PORT}` })));
