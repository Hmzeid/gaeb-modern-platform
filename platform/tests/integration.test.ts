import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import pg from "pg";
import { hashPassword } from "../src/auth.js";
import { importFixedWidth, type Layout } from "../src/migration/engine.js";
import { persistImport, loadJobState, buildJobStateSave } from "../src/migration/load.js";
import { runTransform, BUILDINGS_TRANSFORM } from "../src/migration/transform.js";

// END-TO-END INTEGRATION — synthetic fixtures only (generated data, NOT customer records).
// Pipeline proven here: IBM i-format extract -> parser -> PostgreSQL staging -> approved
// transform -> operational tables -> API (the screen's data source) -> reconciliation.
// Skipped unless TEST_DATABASE_URL points at a disposable PostgreSQL database.
const DB_URL = process.env.TEST_DATABASE_URL;
const opts = { skip: !DB_URL, timeout: 180_000 };

const TABLES = JSON.parse(readFileSync(new URL("../../src/codepages/ibm_tables.json", import.meta.url), "utf8"));
const inv420 = new Map<number, number>();
for (const [b, cp] of Object.entries(TABLES["ibm420"] as Record<string, number>)) if (!inv420.has(cp)) inv420.set(cp, Number(b));
function enc420(s: string, n: number): Buffer {
  const out = [...s].map(ch => inv420.get(ch.codePointAt(0)!)!);
  while (out.length < n) out.push(inv420.get(0x20)!);
  return Buffer.from(out.slice(0, n));
}
function zoned(digits: string): Buffer {
  return Buffer.from([...digits].map(d => 0xf0 | Number(d)));
}
const layout: Layout = { recordLength: 58, fields: [
  { name: "BECD", type: "char", length: 2, encoding: "utf8" },
  { name: "BLRD", type: "char", length: 2, encoding: "utf8" },
  { name: "BLCD", type: "char", length: 7, encoding: "utf8", key: true },
  { name: "SHNM", type: "char", length: 40, encoding: "ibm420" },
  { name: "VGCD", type: "zoned", length: 7, decimals: 0 },
]};
function rec(blcd: string, name: string, vgcd: string): Buffer {
  return Buffer.concat([Buffer.from("01"), Buffer.from("01"), Buffer.from(blcd), enc420(name, 40), zoned(vgcd)]);
}
const r1 = rec("1000001", "مدرسة النيل الابتدائية", "7654321");
const r2 = rec("1000002", "مدرسة النصر الابتدائية", "7654322");
const r3dup = rec("1000001", "مدرسة مكررة", "7654321");
const r4bad = Buffer.from(rec("1000003", "مدرسة فاسدة", "7654323")); r4bad[57] = 0xfa; // corrupt zoned digit
const extract = Buffer.concat([r1, r2, r3dup, r4bad, Buffer.from("TRAILINGJUNK!")]); // +13 stray bytes

test("E2E: extract -> staging -> transform -> operational -> API -> reconciliation (real PostgreSQL)", opts, async () => {
  const admin = new pg.Client(DB_URL!); await admin.connect();
  try { await runE2E(admin); } finally { await admin.end().catch(() => {}); }
});
async function runE2E(admin: pg.Client) {
  const db = { query: (t: string, v?: unknown[]) => admin.query(t, v as any) };
  await admin.query("DROP SCHEMA IF EXISTS app CASCADE; DROP SCHEMA IF EXISTS mig CASCADE; DROP SCHEMA IF EXISTS school_map CASCADE");
  const migDir = new URL("../../migrations/", import.meta.url);
  for (const f of ["001_operational_schema.sql", "002_estimates.sql", "003_migration_meta.sql"])
    await admin.query(readFileSync(new URL(f, migDir), "utf8"));
  await admin.query(readFileSync(new URL("../../../migration/reconciled/schema_v2.sql", import.meta.url), "utf8"));
  for (const [u, role] of [["admin1", "admin"], ["tech1", "technical"], ["budget1", "budget"]] as const)
    await admin.query("INSERT INTO app.users (username, password_hash, role) VALUES ($1,$2,$3)", [u, hashPassword("password-123"), role]);

  // --- pipeline run 1 (single client, one transaction via persistImport) ---
  const batchId = "mig-integration-fixture";
  const state0 = await loadJobState(db, batchId);
  const run1 = importFixedWidth(extract, layout, state0);
  assert.equal(run1.report.totalRecords, 5);
  assert.equal(run1.report.loaded, 2);
  assert.equal(run1.report.rejected.length, 3);
  assert.ok(run1.report.rejected.some(r => /incomplete trailing/.test(r.reason)));
  assert.ok(run1.report.rejected.some(r => /duplicate key/.test(r.reason)));
  await persistImport(db, "school_map.pblbuldg", "fixture.dat", "pblbuldg-v1", run1.records, run1.report);
  const save1 = buildJobStateSave(run1.state); await db.query(save1.text, save1.values);

  const staged = await admin.query("SELECT blcd, shnm, vgcd, _batch_id, _source_offset, _raw_hex FROM school_map.pblbuldg WHERE _batch_id = $1 ORDER BY _source_offset", [batchId]);
  assert.equal(staged.rows.length, 2);
  assert.equal(staged.rows[0].shnm, "مدرسة النيل الابتدائية");
  assert.equal(staged.rows[0]._source_offset, 0); assert.equal(staged.rows[1]._source_offset, 58);
  assert.ok(staged.rows[0]._raw_hex.length === 116);
  const rejects = await admin.query("SELECT COUNT(*)::int n FROM mig.rejects WHERE batch_id = $1", [batchId]);
  assert.equal(rejects.rows[0].n, 3);
  // numeric reconciliation: staged sum == engine control total == batch record
  const sum = await admin.query("SELECT SUM(vgcd)::text s FROM school_map.pblbuldg WHERE _batch_id = $1", [batchId]);
  assert.equal(sum.rows[0].s, run1.report.controlTotals.VGCD);
  assert.equal(run1.report.controlTotals.VGCD, "15308643");
  assert.equal(run1.report.sourceTotals.VGCD, "22962964"); // includes the parseable duplicate — delta is the quarantined value

  // --- retry: same batch, checkpoint restored from DB -> nothing re-inserted ---
  const stateR = await loadJobState(db, batchId);
  assert.equal(stateR.nextOffset, 4);
  const run2 = importFixedWidth(extract, layout, stateR);
  assert.equal(run2.records.length, 0);
  await persistImport(db, "school_map.pblbuldg", "fixture.dat", "pblbuldg-v1", run2.records, run2.report);
  assert.equal((await admin.query("SELECT COUNT(*)::int n FROM school_map.pblbuldg WHERE _batch_id = $1", [batchId])).rows[0].n, 2);
  assert.equal((await admin.query("SELECT COUNT(*)::int n FROM mig.rejects WHERE batch_id = $1", [batchId])).rows[0].n, 3);

  // --- rollback: a poisoned record aborts the whole persist; nothing partial remains ---
  const poison = { batchId: "mig-poison", sourceSha256: "0".repeat(64), totalRecords: 1, loaded: 1, rejected: [],
    controlTotals: {}, sourceTotals: {} };
  const badRec = { values: { BECD: "1", BLRD: "1", BLCD: "1000099", SHNM: "x", VGCD: "not-a-number" }, raw: "ff", offset: 0 };
  await assert.rejects(() => persistImport(db, "school_map.pblbuldg", "poison.dat", "pblbuldg-v1", [badRec], poison));
  assert.equal((await admin.query("SELECT COUNT(*)::int n FROM mig.batches WHERE batch_id = 'mig-poison'")).rows[0].n, 0);
  assert.equal((await admin.query("SELECT COUNT(*)::int n FROM school_map.pblbuldg WHERE _batch_id = 'mig-poison'")).rows[0].n, 0);

  // --- transform gate: real register (pending) refuses; approved fixture register allows ---
  const realRegister = new URL("../../../migration/reconciled/mapping_register_v2.csv", import.meta.url).pathname;
  await assert.rejects(() => runTransform(db, BUILDINGS_TRANSFORM, batchId, realRegister), /not Approved/);
  const dir = mkdtempSync(join(tmpdir(), "gaeb-reg-"));
  const regPath = join(dir, "register.csv");
  writeFileSync(regPath, ["legacy_member,target_schema,target_table,legacy_field,length,decimals,sql_type,inference_rule,approval_status,source_lineage",
    "PBLBULDG,school_map,pblbuldg,BLCD,7,0,INTEGER,x,Approved — integration fixture,x",
    "PBLBULDG,school_map,pblbuldg,SHNM,40,0,VARCHAR(40),x,Approved — integration fixture,x",
    "PBLBULDG,school_map,pblbuldg,VGCD,7,0,INTEGER,x,Approved — integration fixture,x"].join("\n"));
  await runTransform(db, BUILDINGS_TRANSFORM, batchId, regPath);
  await runTransform(db, BUILDINGS_TRANSFORM, batchId, regPath); // idempotent
  const ops = await admin.query("SELECT legacy_blcd, name_ar, village_code FROM app.buildings ORDER BY legacy_blcd");
  assert.equal(ops.rows.length, 2);
  assert.equal(ops.rows[0].name_ar, "مدرسة النيل الابتدائية");
  assert.equal(String(ops.rows[0].village_code), "7654321");

  // --- API surface (what the screens read): login, buildings, report authorization ---
  const server: ChildProcess = spawn("node", ["dist/src/server.js"], {
    cwd: new URL("../..", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: String(DB_URL), PORT: "18099" }, stdio: "ignore" });
  try {
    for (let i = 0; i < 50; i++) { try { const h = await fetch("http://127.0.0.1:18099/health"); if (h.ok) break; } catch {} await new Promise(r => setTimeout(r, 200)); }
    const login = async (u: string) => (await (await fetch("http://127.0.0.1:18099/api/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: "password-123" }) })).json()).token as string;
    const adminToken = await login("admin1"), techToken = await login("tech1"), budgetToken = await login("budget1");
    const buildings = await (await fetch("http://127.0.0.1:18099/api/buildings", { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    assert.equal(buildings.length, 2);
    assert.equal(buildings[0].name_ar, "مدرسة النيل الابتدائية");
    const csvTech = await fetch("http://127.0.0.1:18099/api/reports/budget-utilization.csv", { headers: { Authorization: `Bearer ${techToken}` } });
    assert.equal(csvTech.status, 403); // technical role holds no finance-report grant
    const csvBudget = await fetch("http://127.0.0.1:18099/api/reports/budget-utilization.csv", { headers: { Authorization: `Bearer ${budgetToken}` } });
    assert.equal(csvBudget.status, 200);
    assert.match(await csvBudget.text(), /fiscal_year,allocated,committed,spent,available/);
  } finally { server.kill(); }
}
