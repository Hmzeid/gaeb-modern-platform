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
import { runTransform, BUILDINGS_TRANSFORM, TENDERS_TRANSFORM, EXPROPRIATION_TRANSFORM, CERTIFICATES_TRANSFORM, transformHash } from "../src/migration/transform.js";

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
  await admin.query("DROP SCHEMA IF EXISTS app CASCADE; DROP SCHEMA IF EXISTS mig CASCADE; DROP SCHEMA IF EXISTS school_map CASCADE; DROP SCHEMA IF EXISTS purchases CASCADE; DROP SCHEMA IF EXISTS real_estate CASCADE; DROP SCHEMA IF EXISTS abstracts CASCADE");
  const migDir = new URL("../../migrations/", import.meta.url);
  for (const f of ["001_operational_schema.sql", "002_estimates.sql", "003_migration_meta.sql", "004_migration_integrity.sql", "005_transform_keys.sql", "006_secure_approvals.sql", "007_intake.sql"])
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
  await persistImport(db, "school_map.pblbuldg", "fixture.dat", "pblbuldg-v1", run1.records, run1.report, run1.state);

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
  assert.equal(stateR!.nextOffset, 4);
  const run2 = importFixedWidth(extract, layout, stateR);
  assert.equal(run2.records.length, 0);
  await persistImport(db, "school_map.pblbuldg", "fixture.dat", "pblbuldg-v1", run2.records, run2.report, run2.state);
  // Phase 1 criterion: a retry must NEVER overwrite the original batch totals
  const bt = await admin.query("SELECT loaded FROM mig.batches WHERE batch_id = $1", [batchId]);
  assert.equal(bt.rows[0].loaded, 2, "batch loaded count must survive a zero-load retry");
  const tt = await admin.query("SELECT kind, amount::text a FROM mig.batch_totals WHERE batch_id = $1 AND field = 'VGCD' ORDER BY kind", [batchId]);
  assert.equal(tt.rows.find((r: any) => r.kind === "control").a, "15308643.000000");
  assert.equal(tt.rows.find((r: any) => r.kind === "source").a, "22962964.000000");
  assert.equal((await admin.query("SELECT COUNT(*)::int n FROM school_map.pblbuldg WHERE _batch_id = $1", [batchId])).rows[0].n, 2);
  assert.equal((await admin.query("SELECT COUNT(*)::int n FROM mig.rejects WHERE batch_id = $1", [batchId])).rows[0].n, 3);

  // --- rollback: a poisoned record aborts the whole persist; nothing partial remains ---
  const poison = { batchId: "mig-poison", sourceSha256: "0".repeat(64), startOffset: 0, totalRecords: 1, loaded: 1, rejected: [],
    controlTotals: {}, sourceTotals: {} };
  const badRec = { values: { BECD: "1", BLRD: "1", BLCD: "1000099", SHNM: "x", VGCD: "not-a-number" }, raw: "ff", offset: 0 };
  await assert.rejects(() => persistImport(db, "school_map.pblbuldg", "poison.dat", "pblbuldg-v1", [badRec], poison));
  assert.equal((await admin.query("SELECT COUNT(*)::int n FROM mig.batches WHERE batch_id = 'mig-poison'")).rows[0].n, 0);
  assert.equal((await admin.query("SELECT COUNT(*)::int n FROM school_map.pblbuldg WHERE _batch_id = 'mig-poison'")).rows[0].n, 0);

  // --- transform gate: no DB approvals -> refusal; authenticated fixture approvals allow ---
  await assert.rejects(() => runTransform(db, BUILDINGS_TRANSFORM, batchId), /no approval record/);
  const adminRow = await admin.query("SELECT id FROM app.users WHERE username = 'admin1'");
  const approve = async (spec: any) => {
    for (const f of spec.fields)
      await admin.query("INSERT INTO mig.mapping_approvals (legacy_member, legacy_field, target_table, target_column, transform_name, transform_hash, approved_by, approved_by_user_id, approved_role, mode, status, evidence_ref) VALUES ($1,$2,$3,$4,$5,$6,'integration-fixture-approver',$7,'admin','demo','active','synthetic fixture approval — NOT a customer approval')",
        [spec.legacyMember, f.legacy, "app", f.target, spec.name, transformHash(spec), adminRow.rows[0].id]);
  };
  await approve(BUILDINGS_TRANSFORM);
  await runTransform(db, BUILDINGS_TRANSFORM, batchId);
  await runTransform(db, BUILDINGS_TRANSFORM, batchId); // idempotent
  const ops = await admin.query("SELECT legacy_blcd, name_ar, village_code FROM app.buildings ORDER BY legacy_blcd");
  assert.equal(ops.rows.length, 2);
  assert.equal(ops.rows[0].name_ar, "مدرسة النيل الابتدائية");
  assert.equal(String(ops.rows[0].village_code), "7654321");

  // --- Phase 2: tenders, expropriation, certificates transforms from synthetic staging rows ---
  const B2 = "mig-phase2-fixture";
  await admin.query("INSERT INTO purchases.pbytendr (type, tetnno, tnanm, _batch_id, _source_offset, _raw_hex) VALUES (1, 9001, 'توريد أثاث مدرسي', $1, 0, 'aa')", [B2]);
  await admin.query("INSERT INTO real_estate.remv01pf (blcd, _batch_id, _source_offset, _raw_hex) VALUES (1000001, $1, 0, 'bb')", [B2]);
  await admin.query("INSERT INTO abstracts.inv001pf (blcd, subtyp, ttncd, doccd, bilvlu, _batch_id, _source_offset, _raw_hex) VALUES (1000001, 1, 555, 7, 125000.50, $1, 0, 'cc')", [B2]);
  await approve(TENDERS_TRANSFORM); await approve(EXPROPRIATION_TRANSFORM); await approve(CERTIFICATES_TRANSFORM);
  await runTransform(db, TENDERS_TRANSFORM, B2); await runTransform(db, TENDERS_TRANSFORM, B2);
  await runTransform(db, EXPROPRIATION_TRANSFORM, B2); await runTransform(db, EXPROPRIATION_TRANSFORM, B2);
  await runTransform(db, CERTIFICATES_TRANSFORM, B2); await runTransform(db, CERTIFICATES_TRANSFORM, B2);
  const tender = await admin.query("SELECT title FROM app.tenders WHERE legacy_no = '9001'");
  assert.equal(tender.rows.length, 1); assert.equal(tender.rows[0].title, "توريد أثاث مدرسي");
  const exprop = await admin.query("SELECT stage FROM app.expropriation_cases");
  assert.equal(exprop.rows.length, 1); assert.equal(exprop.rows[0].stage, "pre_decree");
  const cert = await admin.query("SELECT gross::text g, net::text n FROM app.certificates");
  assert.equal(cert.rows.length, 1); assert.equal(cert.rows[0].g, "125000.5000"); assert.equal(cert.rows[0].n, "125000.5000"); // NUMERIC(19,4) storage scale

  // --- streaming import: interruption after chunk 1, then resume to completion ---
  const { streamImportFile } = await import("../src/migration/stream.js");
  const { writeFileSync: wf2, mkdtempSync: mk2 } = await import("node:fs");
  const streamDir = mk2(join(tmpdir(), "gaeb-stream-"));
  const streamPath = join(streamDir, "big.dat");
  { const recs: Buffer[] = [];
    const enc420 = (s: string) => { const tbl = JSON.parse(readFileSync(new URL("../src/codepages/ibm_tables.json", import.meta.url), "utf8"))["ibm420"] as Record<string, number>;
      const inv = new Map<number, number>(); for (const [b, cp] of Object.entries(tbl)) inv.set(cp, Number(b));
      return Buffer.from([...s].map(ch => inv.get(ch.codePointAt(0)!) ?? 0x40)); };
    for (let i = 0; i < 1200; i++) {
      const blcd = i === 700 ? "2000000" : String(2000000 + i); // record 700 duplicates record 0's key
      const rec = Buffer.alloc(58, 0x40); // EBCDIC space padding, as on the real system
      rec.write("01", 0, "utf8"); rec.write("02", 2, "utf8"); rec.write(blcd, 4, "utf8");
      enc420("مدرسة النيل الابتدائية").copy(rec, 11);
      const vg = Buffer.alloc(7, 0xF0); const digits = String(3000000 + i); // zoned: F0-padded digits, last byte zone+digit
      for (let d = 0; d < digits.length; d++) vg[vg.length - digits.length + d] = 0xF0 + Number(digits[d]);
      vg.copy(rec, 51);
      recs.push(rec);
    }
    wf2(streamPath, Buffer.concat(recs));
  }
  const streamLayout = { recordLength: 58, fields: [
    { name: "BECD", type: "char", length: 2, encoding: "utf8" }, { name: "BLRD", type: "char", length: 2, encoding: "utf8" },
    { name: "BLCD", type: "char", length: 7, encoding: "utf8", key: true },
    { name: "SHNM", type: "char", length: 40, encoding: "ibm420" }, { name: "VGCD", type: "zoned", length: 7, decimals: 0 } ] } as any;
  let chunkCalls = 0;
  await assert.rejects(() => streamImportFile(db, streamPath, streamLayout, { table: "school_map.pblbuldg", layoutName: "pbl-stream", chunkRecords: 500,
    afterChunk: () => { chunkCalls++; if (chunkCalls === 1) throw new Error("simulated crash after chunk 1"); } }), /simulated crash/);
  const streamSha = (await import("node:crypto")).createHash("sha256").update(readFileSync(streamPath)).digest("hex");
  const midState = await loadJobState(db, `mig-${streamSha.slice(0, 16)}`);
  assert.equal(midState.nextOffset, 500, "checkpoint must hold exactly the committed chunks");
  const resumed = await streamImportFile(db, streamPath, streamLayout, { table: "school_map.pblbuldg", layoutName: "pbl-stream", chunkRecords: 500 });
  assert.equal(resumed.resumedFromRecord, 500);
  assert.equal(resumed.totalRecords, 1200);
  const sBatch = await admin.query("SELECT loaded, rejected FROM mig.batches WHERE batch_id = $1", [resumed.batchId]);
  assert.equal(sBatch.rows[0].loaded, 1199); assert.equal(sBatch.rows[0].rejected, 1); // the duplicate key
  const sSum = await admin.query("SELECT SUM(vgcd)::text s FROM school_map.pblbuldg WHERE _batch_id = $1", [resumed.batchId]);
  assert.equal(sSum.rows[0].s, "3597718700"); // sum(3000000..3001199)=3600719400 minus record 700's 3000700 (rejected as duplicate key)
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

    // --- secure approvals (§3/§8): operator cannot approve; approver can; revocation bites ---
    const post = (path: string, token: string, body: object) => fetch(`http://127.0.0.1:18099${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    assert.equal((await post("/api/migration/approvals", techToken, { transform: "buildings", mode: "demo", evidenceRef: "x" })).status, 403,
      "technical (operator) must not hold the approve grant — separation of duties");
    assert.equal((await post("/api/migration/approvals", budgetToken, { transform: "buildings", mode: "customer", evidenceRef: "" })).status, 400,
      "customer-mode approvals require evidence");
    assert.equal((await post("/api/migration/approvals", budgetToken, { transform: "buildings", mode: "demo", evidenceRef: "integration fixture sign-off" })).status, 200);
    const appr = await admin.query("SELECT approved_by_user_id, mode, status FROM mig.mapping_approvals WHERE transform_name = 'pblbuldg-to-buildings'");
    assert.ok(appr.rows.every((r: any) => r.approved_by_user_id !== null && r.mode === "demo" && r.status === "active"),
      "approvals must be identity-bound (user id), demo-mode, active");
    assert.equal((await post("/api/migration/approvals/revoke", budgetToken, { transform: "buildings", reason: "integration revocation drill" })).status, 200);
    const afterRevoke = await post("/api/migration/transform", techToken, { name: "buildings", batchId });
    assert.equal(afterRevoke.status, 422, "revoked approvals must block the transform");
    assert.match((await afterRevoke.json()).error, /revoked/);
    assert.equal((await post("/api/migration/approvals", budgetToken, { transform: "buildings", mode: "demo", evidenceRef: "re-approved for integration" })).status, 200);
    const okTr = await post("/api/migration/transform", techToken, { name: "buildings", batchId });
    assert.equal(okTr.status, 200);
    const events = await admin.query("SELECT COUNT(*)::int n FROM mig.mapping_approval_events WHERE transform_name = 'pblbuldg-to-buildings'");
    assert.ok(events.rows[0].n >= 6, "approval history must be append-only and complete (3 fields x approve/revoke/re-approve)");

    // --- Phase 4: executable reconciliation for the fixture batch ---
    const recRes = await fetch(`http://127.0.0.1:18099/api/migration/batches/${batchId}/reconciliation`, { headers: { Authorization: `Bearer ${techToken}` } });
    assert.equal(recRes.status, 200);
    const rec = await recRes.json();
    assert.equal(rec.sourceRecords, 5);
    assert.equal(rec.loadedRecords, 2);
    assert.equal(rec.quarantinedRecords, 3);
    assert.equal(rec.duplicateOccurrences, 1);
    assert.equal(rec.countEquationHolds, true, "source = loaded + quarantined");
    assert.equal(rec.controlTotals.VGCD, "15308643");
    assert.equal(rec.sourceTotals.VGCD, "22962964");
    assert.ok(rec.runs >= 1);

    // --- Phase 4: controlled intake pipeline (no skipped stages, evidence required) ---
    const reg = await fetch("http://127.0.0.1:18099/api/migration/intake", {
      method: "POST", headers: { Authorization: `Bearer ${techToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ member: "PBLBULDG", layoutName: "pblbuldg-native", dataClass: "synthetic" }) });
    assert.equal(reg.status, 201);
    const dsId = (await reg.json()).id;
    const adv = (to: string, evidence?: string) => fetch(`http://127.0.0.1:18099/api/migration/intake/${dsId}/advance`, {
      method: "POST", headers: { Authorization: `Bearer ${techToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, evidence }) });
    assert.equal((await adv("verified", "skip attempt")).status, 422, "stages cannot be skipped");
    assert.equal((await adv("registered")).status, 400, "evidence is mandatory");
    assert.equal((await adv("registered", "manifest + SHA-256 verified against delivery note")).status, 200);
    assert.equal((await adv("verified", "layout hash matches registered layout")).status, 200);
    const budgetIntake = await fetch("http://127.0.0.1:18099/api/migration/intake", {
      method: "POST", headers: { Authorization: `Bearer ${budgetToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ member: "PBLBULDG" }) });
    assert.equal(budgetIntake.status, 403, "intake registration requires migration.run");

    // --- Phase 4 (Workstream E): forged identity in an approval body is ignored ---
    const spoof = await fetch("http://127.0.0.1:18099/api/migration/approvals", {
      method: "POST", headers: { Authorization: `Bearer ${budgetToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transform: "tenders", mode: "demo",
        approvedBy: "admin1", approvedByUserId: 999999, username: "admin1", role: "admin" }) });
    assert.equal(spoof.status, 200);
    const budgetRow = await admin.query("SELECT id FROM app.users WHERE username = 'budget1'");
    const spoofRows = await admin.query(
      "SELECT DISTINCT approved_by, approved_by_user_id, approved_role FROM mig.mapping_approvals WHERE legacy_member = 'PBYTENDR'");
    assert.equal(spoofRows.rows.length, 1);
    assert.equal(spoofRows.rows[0].approved_by, "budget1", "identity comes from the session, never the request body");
    assert.equal(spoofRows.rows[0].approved_by_user_id, budgetRow.rows[0].id);
    assert.equal(spoofRows.rows[0].approved_role, "budget");

    // --- Phase 4: audit trail is admin-only ---
    assert.equal((await fetch("http://127.0.0.1:18099/api/audit", { headers: { Authorization: `Bearer ${techToken}` } })).status, 403);
    const auditRes = await fetch("http://127.0.0.1:18099/api/audit", { headers: { Authorization: `Bearer ${adminToken}` } });
    assert.equal(auditRes.status, 200);
    assert.ok((await auditRes.json()).length > 0);
  } finally { server.kill(); }
}
