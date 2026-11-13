import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import pgPkg from "pg";
const { Pool } = pgPkg;

// Phase 7 Workstream C.2 — negative security tests against a dedicated
// database (gaeb_sec) so they never interfere with the integration suite.
// Covers: login throttling, SQL-injection probes, path traversal on upload
// ids, correlation-id echo, and error-shape discipline (no stack/SQL leaks).
const BASE = "postgres://gaeb@127.0.0.1:54399";
const API = "http://127.0.0.1:18098";
let server: ChildProcess;
let token = "";

async function call(path: string, opts: any = {}) {
  const r = await fetch(`${API}${path}`, { method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined });
  const text = await r.text();
  let json: any = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: r.status, json, text, headers: r.headers };
}

before(async () => {
  const admin = new Pool({ connectionString: `${BASE}/postgres` });
  await admin.query("DROP DATABASE IF EXISTS gaeb_sec");
  await admin.query("CREATE DATABASE gaeb_sec");
  await admin.end();
  const pool = new Pool({ connectionString: `${BASE}/gaeb_sec` });
  const migDir = new URL("../../migrations/", import.meta.url).pathname;
  for (const f of readdirSync(migDir).filter(x => x.endsWith(".sql")).sort())
    await pool.query(readFileSync(`${migDir}/${f}`, "utf8"));
  await pool.query(readFileSync(new URL("../../../migration/reconciled/schema_v2.sql", import.meta.url), "utf8"));
  const { hashPassword } = await import("../src/auth.js");
  await pool.query("INSERT INTO app.users (username, password_hash, role) VALUES ('secadmin', $1, 'admin') ON CONFLICT (username) DO NOTHING",
    [hashPassword("password-123")]);
  await pool.end();
  server = spawn("node", ["dist/src/server.js"], { env: { ...process.env, PORT: "18098",
    DATABASE_URL: `${BASE}/gaeb_sec` }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${API}/health`); if (r.ok) break; } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 200));
  }
  const login = await call("/api/login", { method: "POST", body: { username: "secadmin", password: "password-123" } });
  assert.equal(login.status, 200);
  token = login.json.token;
});

after(() => { server?.kill(); });

test("security: correlation id is echoed and caller-supplied ids are honored", async () => {
  const r = await call("/health", { headers: { "x-request-id": "trace-abc-123" } });
  assert.equal(r.headers.get("x-request-id"), "trace-abc-123");
  const r2 = await call("/health");
  assert.match(r2.headers.get("x-request-id") ?? "", /^req-/);
});

test("security: SQL injection probes do not authenticate or leak rows", async () => {
  for (const payload of ["' OR '1'='1", "secadmin'--", "' UNION SELECT * FROM app.users--"]) {
    const r = await call("/api/login", { method: "POST", body: { username: payload, password: "whatever" } });
    assert.equal(r.status, 401, `payload ${payload} must not authenticate`);
    assert.ok(!r.text.includes("password_hash"), "no hash material in responses");
  }
  // An injection-shaped id is treated as a literal string by the parameterized
  // query: the secure outcome is an empty result (200 []) or a 404 — never
  // leaked rows and never an error exposing internals.
  const inj = await call("/api/migration/batches/'%20OR%20'1'='1/rejects");
  assert.ok(inj.status === 404 || (inj.status === 200 && Array.isArray(inj.json) && inj.json.length === 0),
    `injection-shaped batch id must yield no rows, got ${inj.status}`);
  assert.ok(!inj.text.includes("stack") && !inj.text.includes("pg_"), "no internals leaked");
});

test("security: path traversal upload ids are refused", async () => {
  for (const id of ["..%2f..%2fetc%2fpasswd", "....//....//secret", "%2e%2e%2fconfig"]) {
    const r = await call(`/api/migration/uploads/${id}/import?layout=pblbuldg`, { method: "POST" });
    assert.ok([400, 404].includes(r.status), `traversal id ${id} refused, got ${r.status}`);
  }
});

test("security: login throttling locks out after repeated failures", async () => {
  let last = 0;
  for (let i = 0; i < 11; i++) {
    const r = await call("/api/login", { method: "POST", body: { username: "victim-user", password: "wrong" } });
    last = r.status;
  }
  assert.equal(last, 429, "the attempt budget must trip");
  // A different username from the same client is unaffected.
  const other = await call("/api/login", { method: "POST", body: { username: "someone-else", password: "wrong" } });
  assert.equal(other.status, 401);
});
