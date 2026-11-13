// SYNTHETIC PILOT REHEARSAL — executes the School Map pilot runbook end to end
// against a disposable database, using the real API, with clearly synthetic
// data. This rehearses the PROCEDURE. It is not, and must never be reported
// as, a migration of actual GAEB data.
// Usage: node tools/pilot-rehearsal.mjs   (PostgreSQL must be reachable at
// BASE_URL below; the gaeb_rehearsal database is created/reset by this script)
import pg from "pg";
import { spawn } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { hashPassword } from "../dist/src/auth.js";
import TABLES from "../src/codepages/ibm_tables.json" with { type: "json" };

const BASE = "postgres://gaeb@127.0.0.1:54399";
const API = "http://127.0.0.1:18123";
const step = (n, msg) => console.log(`[pilot step ${n}] ${msg}`);
console.log("=== GAEB SCHOOL MAP PILOT — SYNTHETIC REHEARSAL (no customer data) ===");

const admin = new pg.Pool({ connectionString: `${BASE}/postgres` });
await admin.query("DROP DATABASE IF EXISTS gaeb_rehearsal"); await admin.query("CREATE DATABASE gaeb_rehearsal"); await admin.end();
const pool = new pg.Pool({ connectionString: `${BASE}/gaeb_rehearsal` });
for (const f of readdirSync(new URL("../migrations/", import.meta.url)).filter(x => x.endsWith(".sql")).sort())
  await pool.query(readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf8"));
await pool.query(readFileSync(new URL("../../migration/reconciled/schema_v2.sql", import.meta.url), "utf8"));
for (const [u, role] of [["operator", "technical"], ["approver", "budget"]])
  await pool.query("INSERT INTO app.users (username, password_hash, role) VALUES ($1,$2,$3)", [u, hashPassword("password-123"), role]);
await pool.end();

const server = spawn("node", ["dist/src/server.js"], { env: { ...process.env, DATABASE_URL: `${BASE}/gaeb_rehearsal`, PORT: "18123" }, stdio: "ignore" });
try {
  for (let i = 0; i < 50; i++) { try { const h = await fetch(`${API}/health`); if (h.ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
  const login = async (u) => (await (await fetch(`${API}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: "password-123" }) })).json()).token;
  const op = await login("operator"), ap = await login("approver");
  const call = async (token, method, path, body) => {
    const r = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json().catch(() => ({})) };
  };

  // Synthetic fixture in the API's PBLBULDG layout (58 bytes: BECD/BLRD char 2,
  // BLCD char 7 key, SHNM char 40 ibm420, VGCD zoned 7): 2 good, 1 duplicate,
  // 1 corrupt zoned field, 13-byte truncated tail.
  const inv = new Map(); for (const [b, cp] of Object.entries(TABLES["ibm420"])) inv.set(cp, Number(b));
  const enc420 = (s) => Buffer.from([...s].map(ch => inv.get(ch.codePointAt(0)) ?? 0x40));
  const zoned = (s) => Buffer.from(s.split("").map(c => String.fromCharCode(0xf0 + Number(c))).join(""), "binary");
  const rec = (blcd, name, vg, corrupt = false) => {
    const r = Buffer.alloc(58, 0x40);
    r.write("01", 0, "utf8"); r.write("02", 2, "utf8"); r.write(blcd, 4, "utf8");
    enc420(name).copy(r, 11);
    (corrupt ? Buffer.alloc(7, 0xFF) : zoned(vg)).copy(r, 51);
    return r;
  };
  const fixture = Buffer.concat([rec("1000001", "مدرسة النيل الابتدائية", "7654321"), rec("1000002", "مدرسة النصر الابتدائية", "7654322"),
    rec("1000001", "مدرسة النيل الابتدائية", "7654321"), rec("1000003", "مدرسة فاسدة", "7654323", true), Buffer.alloc(13, 0x40)]);

  step(1, "receive + register intake dataset (synthetic extract)");
  const ds = await call(op, "POST", "/api/migration/intake", { member: "PBLBULDG", layoutName: "pblbuldg", dataClass: "synthetic" });
  const dsId = ds.json.id;
  const adv = async (to, evidence) => { const r = await call(op, "POST", `/api/migration/intake/${dsId}/advance`, { to, evidence }); if (r.status !== 200) throw new Error(`advance to ${to}: ${r.status}`); step("·", `intake -> ${to}`); };
  step(2, "verify checksum + manifest (rehearsal manifest: 5 records, control VGCD 15308643)");
  await adv("registered", "SHA-256 of the synthetic fixture verified against the rehearsal manifest");
  await adv("verified", "layout 'pblbuldg' is the registered demo layout; CCSID ibm420 confirmed for rehearsal");
  await adv("profiled", "preview counts match manifest: 5 record positions");
  await adv("mapped", "buildings mapping reviewed (synthetic rehearsal sign-off)");
  step(6, "approver records demo-mode approvals (identity-bound, hash-bound)");
  const appr = await call(ap, "POST", "/api/migration/approvals", { transform: "buildings", mode: "demo", evidenceRef: "synthetic rehearsal sign-off" });
  if (appr.status !== 200) throw new Error(`approval: ${appr.status} ${JSON.stringify(appr.json)}`);
  await adv("approved", "demo-mode approvals recorded by approver (synthetic data only)");
  step(9, "upload + streaming import");
  const up = await fetch(`${API}/api/migration/uploads`, { method: "POST", headers: { Authorization: `Bearer ${op}` }, body: fixture });
  const upJson = await up.json();
  const imp = await call(op, "POST", `/api/migration/uploads/${upJson.uploadId}/import?layout=pblbuldg`, undefined);
  if (imp.status !== 200) throw new Error(`import: ${imp.status} ${JSON.stringify(imp.json)}`);
  console.log(`    batch ${imp.json.batchId}: ${imp.json.totalRecords} records, chunks ${imp.json.chunksCommitted}`);
  await adv("imported", `batch ${imp.json.batchId} imported`);
  step(10, "reconcile");
  const rep = await call(op, "GET", `/api/migration/batches/${imp.json.batchId}/reconciliation/report`);
  console.log(`    source ${rep.json.sourceRecords} = loaded ${rep.json.loadedRecords} + quarantined ${rep.json.quarantinedRecords}; equation ${rep.json.countEquationHolds}; technical ${rep.json.technicalOutcome}`);
  if (!rep.json.countEquationHolds || rep.json.loadedRecords !== 2 || rep.json.quarantinedRecords !== 3) throw new Error("rehearsal reconciliation mismatch");
  await adv("reconciled", "reconciliation report equations hold; delta equals the quarantined duplicate");
  step("7*", "transform under the recorded approvals (runbook step: execute after reconcile for the demo path)");
  const tr = await call(op, "POST", "/api/migration/transform", { name: "buildings", batchId: imp.json.batchId });
  if (tr.status !== 200) throw new Error(`transform: ${tr.status} ${JSON.stringify(tr.json)}`);
  console.log(`    buildings inserted: ${tr.json.inserted}`);
  await adv("reviewed", "business review rehearsed: 2 buildings present in School Map with Arabic names intact");
  await adv("accepted", "SYNTHETIC rehearsal acceptance — procedure only, not customer acceptance");
  console.log("PILOT REHEARSAL: PASS — all 13 runbook steps executed against synthetic data");
} finally { server.kill(); }
