import express from "express";
import { pool, audit } from "./db.js";
import { verifyPassword, newSessionToken, sessionKey, SESSION_TTL_MS, can, type Role, type Session } from "./auth.js";
import { money, moneyOut, certificateTotals, type Deduction } from "./money.js";
import { certTransition, tenderTransition, estimateTransition, recordDecree, type CertStatus, type TenderStage, type EstimateStatus, type ExpropriationCase } from "./workflow.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
const PORT = Number(process.env.PORT || 8080);

// Security headers (Phase 8, Workstream 6): applied to every response. The
// API serves JSON only; the policy denies framing and sniffing and keeps
// referrers on-origin. TLS itself terminates at the deployment proxy.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Correlation IDs (Phase 7, Workstream I): every request carries an id,
// echoed to the caller and attached to error logs, so an operator can trace
// one request across the API, the audit trail, and support reports.
app.use((req, res, next) => {
  const id = String(req.headers["x-request-id"] ?? "").slice(0, 64) || `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  (req as any).requestId = id;
  res.setHeader("x-request-id", id);
  next();
});

// Login throttling (Phase 7, Workstream C): failed attempts are counted per
// (ip, username) in a sliding 10-minute window; the 10th failure locks the
// pair out until the window slides. A successful login clears the counter.
// In-memory by design for the single-node deployment; the control is the
// attempt budget, not the storage.
const loginFailures = new Map<string, number[]>();
const LOGIN_WINDOW_MS = 10 * 60 * 1000, LOGIN_MAX_FAILURES = 10;
function loginLocked(key: string): boolean {
  const now = Date.now();
  const list = (loginFailures.get(key) ?? []).filter(t => now - t < LOGIN_WINDOW_MS);
  loginFailures.set(key, list);
  return list.length >= LOGIN_MAX_FAILURES;
}
function loginFailed(key: string): void {
  const list = loginFailures.get(key) ?? []; list.push(Date.now()); loginFailures.set(key, list);
}

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
  const lockKey = `${req.ip ?? "?"}|${String(username ?? "")}`;
  if (loginLocked(lockKey)) return res.status(429).json({ error: "too many failed login attempts; try again later" });
  const { rows } = await pool.query("SELECT id, password_hash, role FROM app.users WHERE username = $1 AND is_active", [username]);
  if (!rows.length || !verifyPassword(String(password ?? ""), rows[0].password_hash)) {
    loginFailed(lockKey);
    return res.status(401).json({ error: "invalid credentials" });
  }
  loginFailures.delete(lockKey);
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
const BUILDING_SORTS: Record<string, string> = {
  id: "id", name_en: "name_en", name_ar: "name_ar",
  governorate: "governorate_code", legacy_blcd: "legacy_blcd",
};
app.get("/api/buildings", requireAuth, requirePerm("buildings.read"), async (req, res) => {
  const paged = ["page", "pageSize", "q", "governorate", "sort", "dir"].some(k => req.query[k] !== undefined);
  if (!paged) {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const { rows } = await pool.query("SELECT * FROM app.buildings ORDER BY id LIMIT $1", [limit]);
    return res.json(rows.map(r => ({ ...r, plot_area: String(r.plot_area), building_area: String(r.building_area) })));
  }
  // Phase 9 (A3): server-side pagination. Sort columns and direction are
  // whitelisted (never interpolated from raw input); all values are
  // parameterized. Ordering always ends with the primary key so pages
  // are stable even when many rows share the sort value.
  const pageRaw = Number(req.query.page ?? 1);
  const sizeRaw = Number(req.query.pageSize ?? 25);
  if (!Number.isInteger(pageRaw) || pageRaw < 1) return res.status(400).json({ error: "page must be a positive integer" });
  if (!Number.isInteger(sizeRaw) || sizeRaw < 1 || sizeRaw > 100) return res.status(400).json({ error: "pageSize must be an integer between 1 and 100" });
  const sortKey = String(req.query.sort ?? "id");
  const sortCol = BUILDING_SORTS[sortKey];
  if (!sortCol) return res.status(400).json({ error: "unsupported sort field" });
  const dirRaw = String(req.query.dir ?? "asc").toLowerCase();
  if (dirRaw !== "asc" && dirRaw !== "desc") return res.status(400).json({ error: "dir must be asc or desc" });
  const where: string[] = [];
  const params: unknown[] = [];
  if (req.query.governorate !== undefined && req.query.governorate !== "") {
    const gov = Number(req.query.governorate);
    if (!Number.isInteger(gov)) return res.status(400).json({ error: "governorate must be an integer code" });
    params.push(gov); where.push(`governorate_code = $${params.length}`);
  }
  const q = String(req.query.q ?? "").trim();
  if (q) {
    const esc = q.replace(/[\\%_]/g, c => "\\" + c);
    params.push(`%${esc}%`);
    const p = `$${params.length}`;
    where.push(`(name_en ILIKE ${p} ESCAPE '\\' OR name_ar ILIKE ${p} ESCAPE '\\' OR legacy_blcd ILIKE ${p} ESCAPE '\\')`);
  }
  const wsql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const totalRes = await pool.query(`SELECT COUNT(*)::int AS total FROM app.buildings${wsql}`, params);
  const total = totalRes.rows[0].total as number;
  const order = sortCol === "id" ? `id ${dirRaw}` : `${sortCol} ${dirRaw} NULLS LAST, id ASC`;
  const rowsRes = await pool.query(
    `SELECT * FROM app.buildings${wsql} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, sizeRaw, (pageRaw - 1) * sizeRaw]);
  const rows = rowsRes.rows.map(r => ({ ...r, plot_area: String(r.plot_area), building_area: String(r.building_area) }));
  return res.json({ rows, total, page: pageRaw, pageSize: sizeRaw, pages: Math.max(1, Math.ceil(total / sizeRaw)) });
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
// Certificate detail: header + building context + valued item lines.
app.get("/api/certificates/:id", requireAuth, requirePerm("certificates.read"), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.building_id, c.kind, c.status, c.gross, c.deductions, c.net, c.payment_ref,
            b.name_en AS building_name_en, b.name_ar AS building_name_ar, b.legacy_blcd
       FROM app.certificates c LEFT JOIN app.buildings b ON b.id = c.building_id WHERE c.id = $1`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "certificate not found" });
  const items = await pool.query("SELECT id, description, unit, qty, price, value FROM app.certificate_items WHERE certificate_id = $1 ORDER BY id", [req.params.id]);
  const c = rows[0];
  res.json({
    ...c, gross: String(c.gross), deductions: String(c.deductions), net: String(c.net),
    items: items.rows.map(i => ({ ...i, qty: String(i.qty), price: String(i.price), value: String(i.value) })),
  });
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
// Estimate detail: header + catalogue-backed item lines + revision history.
app.get("/api/estimates/:id", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT id, building_id, title, status, revision, total FROM app.estimates WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "estimate not found" });
  const items = await pool.query(
    `SELECT i.id, i.catalogue_item_id, cat.code, cat.name_en, cat.name_ar, cat.unit, i.qty, i.price, i.value
       FROM app.estimate_items i JOIN app.item_catalogue cat ON cat.id = i.catalogue_item_id
      WHERE i.estimate_id = $1 ORDER BY i.id`, [req.params.id]);
  const revs = await pool.query("SELECT revision, total, changed_by, changed_at, note FROM app.estimate_revisions WHERE estimate_id = $1 ORDER BY revision", [req.params.id]);
  const e = rows[0];
  res.json({
    ...e, total: String(e.total),
    items: items.rows.map(i => ({ ...i, qty: String(i.qty), price: String(i.price), value: String(i.value) })),
    revisions: revs.rows.map(r => ({ ...r, total: String(r.total) })),
  });
});
// User directory (admin only): identity + role + status. Password material is never exposed.
app.get("/api/users", requireAuth, requirePerm("*"), async (_req, res) => {
  const { rows } = await pool.query("SELECT id, username, name_en, name_ar, role, is_active, created_at FROM app.users ORDER BY username");
  res.json(rows);
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
const TENDER_SORTS: Record<string, string> = { id: "id", title: "title", stage: "stage", legacy_no: "legacy_no" };
const TENDER_STAGE_SET = new Set(["draft", "booklet", "published", "bids_open", "bids_closed", "exclusion_review", "envelope_committee", "financial_evaluation", "award_committee", "negotiation", "awarded", "contracted"]);
app.get("/api/tenders", requireAuth, requirePerm("tenders.read"), async (req, res) => {
  const paged = ["page", "pageSize", "q", "stage", "sort", "dir"].some(k => req.query[k] !== undefined);
  if (!paged) {
    const { rows } = await pool.query("SELECT id, legacy_type, legacy_no, title, stage FROM app.tenders ORDER BY id DESC");
    return res.json(rows);
  }
  // Phase 10 (Section 6): server-side pagination for the tenders list,
  // same contract as the School Map: whitelisted sorts, parameterized
  // filters, primary-key tiebreak for stable pages.
  const pageRaw = Number(req.query.page ?? 1);
  const sizeRaw = Number(req.query.pageSize ?? 25);
  if (!Number.isInteger(pageRaw) || pageRaw < 1) return res.status(400).json({ error: "page must be a positive integer" });
  if (!Number.isInteger(sizeRaw) || sizeRaw < 1 || sizeRaw > 100) return res.status(400).json({ error: "pageSize must be an integer between 1 and 100" });
  const sortCol = TENDER_SORTS[String(req.query.sort ?? "id")];
  if (!sortCol) return res.status(400).json({ error: "unsupported sort field" });
  const dirRaw = String(req.query.dir ?? "desc").toLowerCase();
  if (dirRaw !== "asc" && dirRaw !== "desc") return res.status(400).json({ error: "dir must be asc or desc" });
  const where: string[] = [];
  const params: unknown[] = [];
  if (req.query.stage !== undefined && req.query.stage !== "") {
    const stage = String(req.query.stage);
    if (!TENDER_STAGE_SET.has(stage)) return res.status(400).json({ error: "unknown tender stage" });
    params.push(stage); where.push(`stage = $${params.length}`);
  }
  const q = String(req.query.q ?? "").trim();
  if (q) {
    const esc = q.replace(/[\\%_]/g, c => "\\" + c);
    params.push(`%${esc}%`);
    const p = `$${params.length}`;
    where.push(`(title ILIKE ${p} ESCAPE '\\' OR COALESCE(legacy_no::text, '') ILIKE ${p} ESCAPE '\\')`);
  }
  const wsql = where.length ? ` WHERE ${where.join(" AND ")}` : "";
  const totalRes = await pool.query(`SELECT COUNT(*)::int AS total FROM app.tenders${wsql}`, params);
  const total = totalRes.rows[0].total as number;
  const order = sortCol === "id" ? `id ${dirRaw}` : `${sortCol} ${dirRaw} NULLS LAST, id DESC`;
  const rowsRes = await pool.query(
    `SELECT id, legacy_type, legacy_no, title, stage FROM app.tenders${wsql} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, sizeRaw, (pageRaw - 1) * sizeRaw]);
  return res.json({ rows: rowsRes.rows, total, page: pageRaw, pageSize: sizeRaw, pages: Math.max(1, Math.ceil(total / sizeRaw)) });
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
app.get("/api/overview", requireAuth, async (req, res) => {
  try {
    const counts = await pool.query(`SELECT
      (SELECT COUNT(*)::int FROM app.buildings) AS buildings,
      (SELECT COUNT(*)::int FROM app.tenders) AS tenders,
      (SELECT COUNT(*)::int FROM app.certificates) AS certificates,
      (SELECT COUNT(*)::int FROM app.expropriation_cases) AS expropriation_cases,
      (SELECT COUNT(*)::int FROM app.estimates) AS estimates`);
    const tStages = await pool.query("SELECT stage, COUNT(*)::int AS n FROM app.tenders GROUP BY stage ORDER BY n DESC");
    const cStatus = await pool.query("SELECT status, COUNT(*)::int AS n FROM app.certificates GROUP BY status ORDER BY n DESC");
    const queues = await pool.query(`SELECT
      (SELECT COUNT(*)::int FROM app.certificates WHERE status = 'draft') AS certificates_draft,
      (SELECT COUNT(*)::int FROM app.estimates WHERE status = 'draft') AS estimates_draft,
      (SELECT COUNT(*)::int FROM mig.mapping_approvals WHERE status = 'active') AS approvals_active`);
    let moneyAgg: unknown = null;
    if (can((req as any).session.role as Role, "reports.finance")) {
      const b = await pool.query(`SELECT COALESCE(SUM(allocated),0) AS allocated, COALESCE(SUM(committed),0) AS committed,
        COALESCE(SUM(spent),0) AS spent FROM app.budget_allocations`);
      const cs = await pool.query(`SELECT COALESCE(SUM(gross),0) AS gross, COALESCE(SUM(net),0) AS net,
        COALESCE(SUM(net) FILTER (WHERE status = 'paid'),0) AS paid_net FROM app.certificates`);
      const bb = b.rows[0], cc = cs.rows[0];
      moneyAgg = {
        budget: { allocated: String(bb.allocated), committed: String(bb.committed), spent: String(bb.spent),
          available: money(String(bb.allocated)).minus(String(bb.committed)).minus(String(bb.spent)).toString() },
        certificates: { gross: String(cc.gross), net: String(cc.net), paidNet: String(cc.paid_net) },
      };
    }
    res.json({ counts: counts.rows[0], tendersByStage: tStages.rows, certificatesByStatus: cStatus.rows,
      queues: queues.rows[0], money: moneyAgg });
  } catch (e: any) { res.status(500).json({ error: String(e.message || e) }); }
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
import { computeReconciliation, computeReconciliationReport, renderReconciliationReport } from "./migration/reconcile.js";
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
  const gate = await pilotGateError(req.query.dataClass === "customer" ? "customer" : undefined);
  if (gate) return res.status(422).json({ error: gate });
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
/** Live import progress for one batch (Phase 8, Workstream 10). Computed from
 *  the batch totals + checkpoint + run ledger — three indexed reads, no
 *  per-record work. Throughput/ETA derive from the run ledger's wall-clock
 *  span; ETA is explicitly an estimate and is null when it cannot be derived. */
app.get("/api/migration/batches/:id/progress", requireAuth, requirePerm("migration.run"), async (req, res) => {
 try {
  const id = req.params.id;
  const b = await pool.query("SELECT loaded, rejected, source_file FROM mig.batches WHERE batch_id = $1", [id]);
  if (!b.rows.length) return res.status(404).json({ error: "batch not found" });
  const js = await pool.query("SELECT next_offset, key_count FROM mig.job_state WHERE batch_id = $1", [id]);
  const runs = await pool.query(
    "SELECT COUNT(*)::int n, MIN(ran_at) first_at, MAX(ran_at) last_at FROM mig.batch_runs WHERE batch_id = $1", [id]);
  const active = await pool.query(
    "SELECT COUNT(*)::int n FROM mig.import_jobs WHERE batch_id = $1 AND state IN ('QUEUED','VALIDATING','RUNNING','RECONCILING','RECOVERING')", [id]);
  const loaded = Number(b.rows[0].loaded), rejected = Number(b.rows[0].rejected);
  const processed = loaded + rejected;
  const checkpoint = js.rows.length ? Number(js.rows[0].next_offset) : processed;
  // The source record total is only KNOWABLE once the file has been fully
  // consumed (checkpoint = file records) and no job is still active. During
  // an active import the endpoint reports counts + checkpoint and leaves
  // percent/ETA null rather than inventing a denominator.
  const isActive = Number(active.rows[0].n) > 0;
  const total = !isActive && js.rows.length && checkpoint >= processed ? checkpoint : null;
  const firstAt = runs.rows[0].first_at ? new Date(runs.rows[0].first_at).getTime() : null;
  const lastAt = runs.rows[0].last_at ? new Date(runs.rows[0].last_at).getTime() : null;
  const elapsedSec = firstAt && lastAt && lastAt > firstAt ? (lastAt - firstAt) / 1000 : null;
  const rps = elapsedSec && processed > 0 ? processed / elapsedSec : null;
  const remaining = total !== null ? total - processed : null;
  res.json({
    batchId: id, sourceFile: b.rows[0].source_file,
    totalRecords: total, processed, loaded, rejected,
    percentComplete: total ? Math.round((processed / total) * 10000) / 100 : null,
    checkpointRecord: checkpoint,
    keysIndexed: js.rows.length ? Number(js.rows[0].key_count) : loaded,
    runs: Number(runs.rows[0].n),
    status: isActive ? "in-progress" : total !== null && processed >= total ? "complete" : processed > 0 ? "recorded" : "not-started",
    recordsPerSec: rps ? Math.round(rps * 10) / 10 : null,
    etaSeconds: rps && remaining !== null && remaining > 0 ? Math.ceil(remaining / rps) : null,
    etaIsEstimate: true,
  });
 } catch (e: any) { res.status(500).json({ error: String(e.message || e) }); }
});
/** Executable reconciliation for one batch (Workstream D definitions). */
app.get("/api/migration/batches/:id/reconciliation", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const rec = await computeReconciliation(pool, req.params.id);
  if (!rec) return res.status(404).json({ error: "batch not found" });
  res.json(rec);
});
/** Full reconciliation report: ?format=text renders the human-readable version;
 *  default is the machine-readable JSON. Both carry the three separate outcomes. */
app.get("/api/migration/batches/:id/reconciliation/report", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const rep = await computeReconciliationReport(pool, req.params.id);
  if (!rep) return res.status(404).json({ error: "batch not found" });
  if (req.query.format === "text") return res.type("text/plain").send(renderReconciliationReport(rep));
  res.json(rep);
});

const INTAKE_STAGES = ["received", "registered", "verified", "profiled", "mapped", "approved", "imported", "reconciled", "reviewed", "accepted"];
/** Controlled intake pipeline (Workstream C): register a received dataset, then
 *  advance it stage by stage. Forward moves of exactly one stage only; 'rejected'
 *  is reachable from any stage. Every transition is evidenced and audited. */
app.post("/api/migration/intake", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const { member, layoutName, layoutHash, sourceSha256, sizeBytes, batchId, dataClass } = req.body ?? {};
  if (!member) return res.status(400).json({ error: "member is required" });
  const ins = await pool.query(
    `INSERT INTO mig.intake_datasets (member, layout_name, layout_hash, source_sha256, size_bytes, batch_id, data_class, created_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [member, layoutName ?? null, layoutHash ?? null, sourceSha256 ?? null, sizeBytes ?? null, batchId ?? null,
     dataClass === "synthetic" ? "synthetic" : "customer", (req as any).session.userId]);
  await pool.query(`INSERT INTO mig.intake_events (dataset_id, from_stage, to_stage, evidence, actor_user_id) VALUES ($1, NULL, 'received', $2, $3)`,
    [ins.rows[0].id, "dataset received and registered in the intake pipeline", (req as any).session.userId]);
  await audit((req as any).session.userId, "migration.intake.register", "intake_dataset", String(ins.rows[0].id), { member });
  res.status(201).json({ id: ins.rows[0].id, stage: "received" });
});
app.get("/api/migration/intake", requireAuth, requirePerm("migration.run"), async (_req, res) => {
  const r = await pool.query(
    `SELECT d.*, u.username AS created_by FROM mig.intake_datasets d JOIN app.users u ON u.id = d.created_by_user_id ORDER BY d.id DESC LIMIT 200`);
  res.json(r.rows);
});
app.post("/api/migration/intake/:id/advance", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const { to, evidence } = req.body ?? {};
  if (!evidence || typeof evidence !== "string") return res.status(400).json({ error: "evidence is required for every stage transition" });
  const ds = await pool.query(`SELECT stage FROM mig.intake_datasets WHERE id=$1`, [req.params.id]);
  if (!ds.rows.length) return res.status(404).json({ error: "dataset not found" });
  const from = ds.rows[0].stage;
  const okNext = to === "rejected" || INTAKE_STAGES.indexOf(to) === INTAKE_STAGES.indexOf(from) + 1;
  if (!okNext) return res.status(422).json({ error: `cannot move from ${from} to ${to}: stages advance one step at a time (or to 'rejected')` });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE mig.intake_datasets SET stage=$1, updated_at=now() WHERE id=$2`, [to, req.params.id]);
    await client.query(`INSERT INTO mig.intake_events (dataset_id, from_stage, to_stage, evidence, actor_user_id) VALUES ($1,$2,$3,$4,$5)`,
      [req.params.id, from, to, evidence, (req as any).session.userId]);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
  await audit((req as any).session.userId, "migration.intake.advance", "intake_dataset", String(req.params.id), { from, to });
  res.json({ id: Number(req.params.id), from, to });
});

/** Import orchestration (Phase 5 Workstream C): execution-level jobs with
 *  lease-based worker ownership. Governance stays in the intake pipeline —
 *  a COMPLETED job is a technical outcome, never customer acceptance. */
const JOB_TRANSITIONS: Record<string, string[]> = {
  QUEUED: ["VALIDATING", "CANCELLED"],
  VALIDATING: ["RUNNING", "FAILED", "CANCELLED"],
  RUNNING: ["RECONCILING", "FAILED", "CANCELLED", "RECOVERING"],
  RECONCILING: ["COMPLETED", "FAILED", "CANCELLED"],
  RECOVERING: ["QUEUED", "RUNNING", "FAILED", "CANCELLED"],
  FAILED: ["QUEUED", "CANCELLED"],
  COMPLETED: [], CANCELLED: [],
};
app.post("/api/migration/jobs", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const { member, layoutName, sourceSha256, datasetId, batchId } = req.body ?? {};
  if (!member || !layoutName) return res.status(400).json({ error: "member and layoutName are required" });
  try {
    const ins = await pool.query(
      `INSERT INTO mig.import_jobs (member, layout_name, source_sha256, dataset_id, batch_id, created_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [member, layoutName, sourceSha256 ?? null, datasetId ?? null, batchId ?? null, (req as any).session.userId]);
    await pool.query(`INSERT INTO mig.import_job_events (job_id, from_state, to_state, actor, note) VALUES ($1, NULL, 'QUEUED', $2, 'job registered')`,
      [ins.rows[0].id, (req as any).session.username ?? String((req as any).session.userId)]);
    res.status(201).json({ id: ins.rows[0].id, state: "QUEUED" });
  } catch (e: any) {
    if (String(e.code) === "23505") return res.status(409).json({ error: "an active job already exists for this source extract" });
    throw e;
  }
});
app.get("/api/migration/jobs", requireAuth, requirePerm("migration.run"), async (_req, res) => {
  const r = await pool.query(`SELECT * FROM mig.import_jobs ORDER BY id DESC LIMIT 200`);
  res.json(r.rows);
});
app.post("/api/migration/jobs/:id/claim", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const worker = String((req.body ?? {}).worker ?? "");
  if (!worker) return res.status(400).json({ error: "worker identity is required" });
  const r = await pool.query(
    `UPDATE mig.import_jobs SET claimed_by = $2, lease_expires_at = now() + interval '10 minutes',
       attempts = attempts + 1, updated_at = now()
      WHERE id = $1 AND state IN ('QUEUED','RUNNING','RECOVERING')
        AND (claimed_by IS NULL OR lease_expires_at < now())
      RETURNING id, state`, [req.params.id, worker]);
  if (!r.rows.length) return res.status(409).json({ error: "job is not claimable (already claimed, live lease, or terminal)" });
  await pool.query(`INSERT INTO mig.import_job_events (job_id, from_state, to_state, actor, note) VALUES ($1, $2, $2, $3, 'lease claimed')`,
    [req.params.id, r.rows[0].state, worker]);
  res.json({ id: Number(req.params.id), claimedBy: worker, state: r.rows[0].state });
});
app.post("/api/migration/jobs/:id/transition", requireAuth, requirePerm("migration.run"), async (req, res) => {
  const { to, note, failureClass } = req.body ?? {};
  const job = await pool.query(`SELECT state, created_by_user_id FROM mig.import_jobs WHERE id = $1`, [req.params.id]);
  if (!job.rows.length) return res.status(404).json({ error: "job not found" });
  const from = job.rows[0].state;
  if (to === "CANCELLED" && job.rows[0].created_by_user_id !== (req as any).session.userId && (req as any).session.role !== "admin")
    return res.status(403).json({ error: "only the job's creator or an admin may cancel it" });
  if (!(JOB_TRANSITIONS[from] ?? []).includes(to))
    return res.status(422).json({ error: `invalid job transition ${from} -> ${to}` });
  await pool.query(`UPDATE mig.import_jobs SET state = $1, failure_class = $2, error = $3, updated_at = now(),
      claimed_by = CASE WHEN $1 IN ('COMPLETED','FAILED','CANCELLED') THEN claimed_by ELSE claimed_by END WHERE id = $4`,
    [to, failureClass ?? null, note ?? null, req.params.id]);
  await pool.query(`INSERT INTO mig.import_job_events (job_id, from_state, to_state, actor, note) VALUES ($1,$2,$3,$4,$5)`,
    [req.params.id, from, to, String((req as any).session.userId), note ?? null]);
  res.json({ id: Number(req.params.id), from, to });
});

/** Operational metrics (Phase 5 Workstream H): every figure is computed from
 *  live database state. No source record content is ever included. */
app.get("/api/migration/metrics", requireAuth, requirePerm("migration.run"), async (_req, res) => {
  const b = await pool.query(`SELECT COUNT(*)::int AS batches, COALESCE(SUM(loaded),0)::bigint AS loaded,
    COALESCE(SUM(rejected),0)::bigint AS rejected, MAX(finished_at) AS last_batch_at FROM mig.batches`);
  const intake = await pool.query(`SELECT stage, COUNT(*)::int AS n FROM mig.intake_datasets GROUP BY stage ORDER BY stage`);
  const jobs = await pool.query(`SELECT state, COUNT(*)::int AS n FROM mig.import_jobs GROUP BY state ORDER BY state`);
  const appr = await pool.query(`SELECT COUNT(*)::int AS n FROM mig.mapping_approvals WHERE status = 'active'`);
  const keys = await pool.query(`SELECT COUNT(*)::bigint AS n FROM mig.loaded_keys`);
  res.json({ batches: b.rows[0].batches, recordsLoaded: Number(b.rows[0].loaded), recordsRejected: Number(b.rows[0].rejected),
    lastBatchAt: b.rows[0].last_batch_at, intakeByStage: intake.rows, jobsByState: jobs.rows,
    activeApprovals: appr.rows[0].n, indexedKeys: Number(keys.rows[0].n) });
});

/** Audit trail (Workstream F): admin-only, newest first. */
app.get("/api/audit", requireAuth, requirePerm("*"), async (_req, res) => {
  const r = await pool.query(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.at, u.username FROM app.audit_log a LEFT JOIN app.users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 200`);
  res.json(r.rows);
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
  const r = await pool.query("SELECT legacy_member, legacy_field, target_column, transform_name, transform_hash, approved_by, evidence_ref, approved_at, mode, status FROM mig.mapping_approvals ORDER BY transform_name, legacy_field");
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
    const who = await client.query("SELECT username FROM app.users WHERE id = $1", [s.userId]);
    const approverName = who.rows[0]?.username ?? String(s.userId);
    const { transformHash } = await import("./migration/transform.js");
    const hash = transformHash(spec);
    for (const f of spec.fields) {
      await client.query(`INSERT INTO mig.mapping_approvals (legacy_member, legacy_field, target_table, target_column, transform_name, transform_hash, approved_by, approved_by_user_id, approved_role, mode, status, evidence_ref)
        VALUES ($1,$2,'app',$3,$4,$5,$6,$7,$8,$9,'active',$10)
        ON CONFLICT (legacy_member, legacy_field, transform_name) DO UPDATE SET transform_hash = EXCLUDED.transform_hash,
          approved_by = EXCLUDED.approved_by, approved_by_user_id = EXCLUDED.approved_by_user_id, approved_role = EXCLUDED.approved_role,
          mode = EXCLUDED.mode, status = 'active', evidence_ref = EXCLUDED.evidence_ref, approved_at = now(),
          revoked_by_user_id = NULL, revoked_at = NULL, revoke_reason = NULL`,
        [spec.legacyMember, f.legacy, f.target, spec.name, hash, approverName, s.userId, s.role, mode, evidence]);
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
// ---------------------------------------------------------------------------
// Phase 12: governed pilot activation. A pilot becomes active only when
// every mandatory condition is satisfied — automated conditions are
// verified live by the server at verification AND activation time;
// attestation conditions require an administrator to record an evidence
// reference (a document/signature reference, never a bare checkbox).
// Customer-data imports are refused while no pilot is active.
// ---------------------------------------------------------------------------
const PILOT_CONDITIONS: { key: string; kind: "auto" | "attestation" }[] = [
  { key: "charter_approved", kind: "attestation" },
  { key: "scope_approved", kind: "attestation" },
  { key: "bd_decisions", kind: "attestation" },
  { key: "transform_approvals", kind: "auto" },
  { key: "extract_authorization", kind: "attestation" },
  { key: "environment_approved", kind: "attestation" },
  { key: "env_preflight", kind: "auto" },
  { key: "backup_restore_verified", kind: "attestation" },
  { key: "monitoring_alerts_verified", kind: "attestation" },
  { key: "transfer_mechanism_approved", kind: "attestation" },
  { key: "participants_assigned", kind: "attestation" },
  { key: "security_prerequisites", kind: "attestation" },
];
async function verifyAutoCondition(key: string): Promise<{ ok: boolean; detail: string }> {
  if (key === "env_preflight") {
    const v = await pool.query("SHOW server_version");
    if (!String(v.rows[0].server_version).startsWith("16")) return { ok: false, detail: "PostgreSQL 16 required" };
    const ext = await pool.query("SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm'");
    if (!ext.rowCount) return { ok: false, detail: "pg_trgm extension unavailable" };
    const idx = await pool.query("SELECT COUNT(*)::int n FROM pg_indexes WHERE schemaname = 'app' AND indexname LIKE '%trgm%'");
    if ((idx.rows[0].n as number) < 3) return { ok: false, detail: `trigram indexes incomplete (${idx.rows[0].n}/3)` };
    const mig = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'mig' AND table_name = 'import_jobs'");
    if (!mig.rowCount) return { ok: false, detail: "migration control schema incomplete" };
    return { ok: true, detail: "PostgreSQL 16, pg_trgm available, 3 trigram indexes, migration schema complete" };
  }
  if (key === "transform_approvals") {
    const a = await pool.query("SELECT COUNT(*)::int n FROM mig.mapping_approvals WHERE mode = 'customer' AND status = 'active'");
    if ((a.rows[0].n as number) < 1) return { ok: false, detail: "no active customer-mode mapping approvals" };
    return { ok: true, detail: `${a.rows[0].n} active customer-mode mapping approval rows` };
  }
  return { ok: false, detail: "not an automated condition" };
}
async function activePilot() {
  const r = await pool.query("SELECT id, name FROM app.pilots WHERE status = 'active' ORDER BY id LIMIT 1");
  return r.rows[0] ?? null;
}
async function pilotGateError(dataClass: string | undefined): Promise<string | null> {
  if (dataClass !== "customer") return null;
  const p = await activePilot();
  return p ? null : "customer-data import refused: no active pilot. Customer data may only enter the platform under an activated pilot (all mandatory activation conditions satisfied).";
}
app.get("/api/pilots", requireAuth, requirePerm("migration.run"), async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM app.pilots ORDER BY id DESC");
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: String(e.message || e) }); }
});
app.post("/api/pilots", requireAuth, requirePerm("*"), async (req, res) => {
  const name = String((req.body ?? {}).name ?? "").trim();
  const environment = String((req.body ?? {}).environment ?? "pilot").trim() || "pilot";
  if (!name) return res.status(400).json({ error: "pilot name is required" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query("INSERT INTO app.pilots (name, environment, created_by_user_id) VALUES ($1,$2,$3) RETURNING id", [name, environment, (req as any).session.userId]);
    const id = ins.rows[0].id;
    for (const c of PILOT_CONDITIONS) await client.query("INSERT INTO app.pilot_conditions (pilot_id, condition_key, kind) VALUES ($1,$2,$3)", [id, c.key, c.kind]);
    await client.query("COMMIT");
    await audit((req as any).session.userId, "pilot.create", "pilot", String(id), { name, environment });
    res.status(201).json({ id, name, environment, status: "draft" });
  } catch (e: any) { await client.query("ROLLBACK").catch(() => {}); res.status(422).json({ error: String(e.message || e) }); }
  finally { client.release(); }
});
app.get("/api/pilots/:id", requireAuth, requirePerm("migration.run"), async (req, res) => {
  try {
    const p = await pool.query("SELECT * FROM app.pilots WHERE id = $1", [req.params.id]);
    if (!p.rows.length) return res.status(404).json({ error: "pilot not found" });
    const c = await pool.query("SELECT condition_key, kind, status, evidence_ref, satisfied_at FROM app.pilot_conditions WHERE pilot_id = $1 ORDER BY condition_key", [req.params.id]);
    res.json({ ...p.rows[0], conditions: c.rows });
  } catch (e: any) { res.status(500).json({ error: String(e.message || e) }); }
});
app.post("/api/pilots/:id/conditions/:key/attest", requireAuth, requirePerm("*"), async (req, res) => {
  const spec = PILOT_CONDITIONS.find(c => c.key === req.params.key);
  if (!spec) return res.status(404).json({ error: "unknown condition" });
  if (spec.kind !== "attestation") return res.status(400).json({ error: "automated condition — use verify, which checks the live system" });
  const evidenceRef = String((req.body ?? {}).evidenceRef ?? "").trim();
  if (!evidenceRef) return res.status(400).json({ error: "an evidence reference (document / signature reference) is required — a bare checkbox is not authorization" });
  const upd = await pool.query("UPDATE app.pilot_conditions SET status = 'satisfied', evidence_ref = $1, satisfied_by_user_id = $2, satisfied_at = now() WHERE pilot_id = $3 AND condition_key = $4 RETURNING condition_key", [evidenceRef, (req as any).session.userId, req.params.id, req.params.key]);
  if (!upd.rowCount) return res.status(404).json({ error: "pilot not found" });
  await audit((req as any).session.userId, "pilot.condition.attest", "pilot", String(req.params.id), { condition: req.params.key, evidenceRef });
  res.json({ ok: true, condition: req.params.key, status: "satisfied" });
});
app.post("/api/pilots/:id/conditions/:key/verify", requireAuth, requirePerm("*"), async (req, res) => {
  const spec = PILOT_CONDITIONS.find(c => c.key === req.params.key);
  if (!spec) return res.status(404).json({ error: "unknown condition" });
  if (spec.kind !== "auto") return res.status(400).json({ error: "attestation condition — use attest with an evidence reference" });
  const chk = await verifyAutoCondition(spec.key);
  if (!chk.ok) return res.status(422).json({ error: `verification failed: ${chk.detail}` });
  const upd = await pool.query("UPDATE app.pilot_conditions SET status = 'satisfied', evidence_ref = $1, satisfied_by_user_id = $2, satisfied_at = now() WHERE pilot_id = $3 AND condition_key = $4 RETURNING condition_key", [`auto: ${chk.detail}`, (req as any).session.userId, req.params.id, req.params.key]);
  if (!upd.rowCount) return res.status(404).json({ error: "pilot not found" });
  await audit((req as any).session.userId, "pilot.condition.verify", "pilot", String(req.params.id), { condition: req.params.key, detail: chk.detail });
  res.json({ ok: true, condition: req.params.key, status: "satisfied", detail: chk.detail });
});
app.post("/api/pilots/:id/activate", requireAuth, requirePerm("*"), async (req, res) => {
  const p = await pool.query("SELECT status FROM app.pilots WHERE id = $1", [req.params.id]);
  if (!p.rows.length) return res.status(404).json({ error: "pilot not found" });
  if (p.rows[0].status !== "draft") return res.status(422).json({ error: `pilot is ${p.rows[0].status}` });
  const conds = await pool.query("SELECT condition_key, kind, status FROM app.pilot_conditions WHERE pilot_id = $1", [req.params.id]);
  const missing: string[] = [];
  for (const c of conds.rows) {
    if (c.kind === "auto") { const chk = await verifyAutoCondition(c.condition_key); if (!chk.ok) missing.push(`${c.condition_key} (${chk.detail})`); }
    else if (c.status !== "satisfied") missing.push(c.condition_key);
  }
  if (missing.length) return res.status(422).json({ error: "mandatory activation conditions are not satisfied", missing });
  await pool.query("UPDATE app.pilots SET status = 'active', activated_by_user_id = $1, activated_at = now() WHERE id = $2", [(req as any).session.userId, req.params.id]);
  await audit((req as any).session.userId, "pilot.activate", "pilot", String(req.params.id), {});
  res.json({ ok: true, status: "active" });
});
app.post("/api/pilots/:id/close", requireAuth, requirePerm("*"), async (req, res) => {
  const upd = await pool.query("UPDATE app.pilots SET status = 'closed', closed_by_user_id = $1, closed_at = now() WHERE id = $2 AND status = 'active' RETURNING id", [(req as any).session.userId, req.params.id]);
  if (!upd.rowCount) return res.status(422).json({ error: "only an active pilot can be closed" });
  await audit((req as any).session.userId, "pilot.close", "pilot", String(req.params.id), {});
  res.json({ ok: true, status: "closed" });
});

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
  const gate = await pilotGateError(req.query.dataClass === "customer" ? "customer" : undefined);
  if (gate) return res.status(422).json({ error: gate });
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
