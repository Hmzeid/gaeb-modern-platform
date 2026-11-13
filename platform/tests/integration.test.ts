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
  for (const f of ["001_operational_schema.sql", "002_estimates.sql", "003_migration_meta.sql", "004_migration_integrity.sql", "005_transform_keys.sql", "006_secure_approvals.sql", "007_intake.sql", "008_scalable_checkpoint.sql", "009_import_jobs.sql", "010_buildings_pagination_indexes.sql", "011_buildings_trigram_search.sql", "012_pilots.sql"])
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
    // Phase UX: overview aggregate — counts for every role, money only with reports.finance
    const ovTech = await (await fetch("http://127.0.0.1:18099/api/overview", { headers: { Authorization: `Bearer ${techToken}` } })).json();
    assert.ok(ovTech.counts.buildings >= 1 && ovTech.counts.tenders >= 1, "overview counts reflect seeded data");
    assert.equal(ovTech.money, null, "technical role must not receive money aggregates");
    const ovBudget = await (await fetch("http://127.0.0.1:18099/api/overview", { headers: { Authorization: `Bearer ${budgetToken}` } })).json();
    assert.ok(ovBudget.money && typeof ovBudget.money.budget.allocated === "string", "budget role receives money aggregates");
    // UI certification: detail endpoints return valued lines + revision history
    const newCert = await (await fetch("http://127.0.0.1:18099/api/certificates", {
      method: "POST", headers: { Authorization: `Bearer ${techToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ building_id: buildings[0].id, kind: "construction", items: [{ description: "Concrete works", unit: "m3", qty: "10", price: "100" }], deductions: [{ kind: "retention", percent: "10" }] }),
    })).json();
    const certDetail = await (await fetch(`http://127.0.0.1:18099/api/certificates/${newCert.id}`, { headers: { Authorization: `Bearer ${techToken}` } })).json();
    assert.ok(Array.isArray(certDetail.items) && certDetail.items.length === 1 && certDetail.items[0].value === "1000.0000", "certificate detail returns valued item lines");
    assert.equal(certDetail.net, "900.0000", "certificate detail net = gross - retention, exact decimal");
    const certList = await (await fetch("http://127.0.0.1:18099/api/certificates", { headers: { Authorization: `Bearer ${techToken}` } })).json();
    assert.equal(certList[0].net, certDetail.net, "certificate detail net matches list");
    let catalogue = await (await fetch("http://127.0.0.1:18099/api/catalogue", { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    if (!catalogue.length) {
      await fetch("http://127.0.0.1:18099/api/catalogue", { method: "POST", headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ code: "CERT-001", name_en: "Certification item", name_ar: "بند اعتماد", unit: "m3", standard_price: "100" }) });
      catalogue = await (await fetch("http://127.0.0.1:18099/api/catalogue", { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    }
    const newEst = await (await fetch("http://127.0.0.1:18099/api/estimates", {
      method: "POST", headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ building_id: buildings[0].id, title: "Certification estimate", items: [{ catalogue_item_id: catalogue[0].id, qty: "2" }] }),
    })).json();
    const estDetail = await (await fetch(`http://127.0.0.1:18099/api/estimates/${newEst.id}`, { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    assert.ok(Array.isArray(estDetail.items) && estDetail.items.length >= 1, "estimate detail returns catalogue lines");
    assert.ok(Array.isArray(estDetail.revisions) && estDetail.revisions.length >= 1, "estimate detail returns revision history");
    // UI certification: authorization negatives — admin directory + unauthenticated access
    const usersTech = await fetch("http://127.0.0.1:18099/api/users", { headers: { Authorization: `Bearer ${techToken}` } });
    assert.equal(usersTech.status, 403, "user directory is admin-only");
    const usersAdmin = await (await fetch("http://127.0.0.1:18099/api/users", { headers: { Authorization: `Bearer ${adminToken}` } })).json();
    assert.ok(usersAdmin.length >= 3 && !("password_hash" in usersAdmin[0]), "user directory never exposes password material");
    const ovAnon = await fetch("http://127.0.0.1:18099/api/overview");
    assert.equal(ovAnon.status, 401, "overview requires authentication");
    const certAnon = await fetch("http://127.0.0.1:18099/api/certificates/1");
    assert.equal(certAnon.status, 401, "certificate detail requires authentication");
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

    // --- Phase 5 (Workstream B): cross-chunk duplicates caught by the keys table; O(1) checkpoint ---
    const { streamImportFile: stream2 } = await import("../src/migration/stream.js");
    const { writeFileSync: wf5, mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const dir5 = mkdtempSync(`${tmpdir()}/gaeb-p5-`);
    const recs5: Buffer[] = [];
    const mkRec5 = (blcd: string, vg: number) => {
      const z = (s: string) => Buffer.from(s.split("").map(c => String.fromCharCode(0xf0 + Number(c))).join(""), "binary");
      return Buffer.concat([Buffer.from("01", "utf8"), Buffer.from("02", "utf8"),
        Buffer.from(blcd.padEnd(7, " "), "utf8"), Buffer.alloc(40, 0x40), z(String(vg).padStart(7, "0"))]);
    };
    // numeric keys (staging BLCD is INTEGER) across 3 chunks of 2; record 5 duplicates record 1's key (cross-chunk)
    for (const [k, v] of [["1000001", 10], ["1000002", 20], ["1000003", 30], ["1000004", 40], ["1000001", 99]] as const) recs5.push(mkRec5(k, v));
    const path5 = `${dir5}/cross-chunk.dat`; wf5(path5, Buffer.concat(recs5));
    const r5 = await stream2(db, path5, streamLayout, { table: "school_map.pblbuldg", layoutName: "pbl-stream", chunkRecords: 2 });
    const b5 = await admin.query("SELECT loaded, rejected FROM mig.batches WHERE batch_id = $1", [r5.batchId]);
    assert.equal(b5.rows[0].loaded, 4, "cross-chunk duplicate must not load");
    assert.equal(b5.rows[0].rejected, 1);
    const js5 = await admin.query("SELECT next_offset, key_count, loaded_keys FROM mig.job_state WHERE batch_id = $1", [r5.batchId]);
    assert.equal(js5.rows[0].next_offset, 5);
    assert.equal(Number(js5.rows[0].key_count), 4, "checkpoint tracks the key count, not the set");
    assert.deepEqual(js5.rows[0].loaded_keys, [], "the O(n^2) JSONB key set is no longer written on the streaming path");
    const lk5 = await admin.query("SELECT COUNT(*)::int n FROM mig.loaded_keys WHERE batch_id = $1", [r5.batchId]);
    assert.equal(lk5.rows[0].n, 4);
    const sum5 = await admin.query("SELECT SUM(vgcd)::text s FROM school_map.pblbuldg WHERE _batch_id = $1", [r5.batchId]);
    assert.equal(sum5.rows[0].s, "100", "control value excludes the duplicate's 99 (10+20+30+40)");

    // --- Phase 5 (Workstream C): import job lifecycle ---
    const jobPost = (token: string, body: object) => fetch("http://127.0.0.1:18099/api/migration/jobs", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const job1 = await jobPost(techToken, { member: "PBLBULDG", layoutName: "pblbuldg-v1", sourceSha256: "p5-sha-1" });
    assert.equal(job1.status, 201); const jobId = (await job1.json()).id;
    assert.equal((await jobPost(techToken, { member: "PBLBULDG", layoutName: "pblbuldg-v1", sourceSha256: "p5-sha-1" })).status, 409,
      "duplicate active job for the same extract is refused");
    const claim = (worker: string) => fetch(`http://127.0.0.1:18099/api/migration/jobs/${jobId}/claim`, {
      method: "POST", headers: { Authorization: `Bearer ${techToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ worker }) });
    assert.equal((await claim("worker-a")).status, 200);
    assert.equal((await claim("worker-b")).status, 409, "a live lease cannot be claimed by a second worker");
    const trans = (token: string, to: string) => fetch(`http://127.0.0.1:18099/api/migration/jobs/${jobId}/transition`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ to }) });
    assert.equal((await trans(techToken, "COMPLETED")).status, 422, "QUEUED cannot jump to COMPLETED");
    assert.equal((await trans(budgetToken, "CANCELLED")).status, 403, "budget lacks migration.run entirely");
    // a second operator (not the creator) cannot cancel
    await admin.query("INSERT INTO app.users (username, password_hash, role) VALUES ('tech2', $1, 'technical') ON CONFLICT (username) DO NOTHING", [hashPassword("password-123")]);
    const tech2Token = await login("tech2");
    assert.equal((await trans(tech2Token, "CANCELLED")).status, 403, "non-creator operator cannot cancel");
    assert.equal((await trans(techToken, "CANCELLED")).status, 200, "creator can cancel");
    const metrics = await (await fetch("http://127.0.0.1:18099/api/migration/metrics", { headers: { Authorization: `Bearer ${techToken}` } })).json();
    assert.ok(metrics.batches >= 3 && metrics.indexedKeys >= 4, "metrics reflect live state");

    // --- Phase 8 (Workstream 10): live progress endpoint for the streamed batch ---
    const progRes = await fetch(`http://127.0.0.1:18099/api/migration/batches/${r5.batchId}/progress`, { headers: { Authorization: `Bearer ${techToken}` } });
    assert.equal(progRes.status, 200);
    const prog = await progRes.json();
    assert.ok(prog.processed >= 5 && prog.checkpointRecord >= 5, "progress reflects the streamed import");
    assert.ok(prog.keysIndexed >= 4 && prog.etaIsEstimate === true, "progress carries keys + estimate flag");
    assert.ok(["complete", "recorded"].includes(prog.status), "finished batch is not reported as in-progress");
    const progMissing = await fetch("http://127.0.0.1:18099/api/migration/batches/mig-nope/progress", { headers: { Authorization: `Bearer ${techToken}` } });
    assert.equal(progMissing.status, 404);

    // --- Phase 5 (Workstream D): reconciliation report — provenance + three separate outcomes ---
    const repRes = await fetch(`http://127.0.0.1:18099/api/migration/batches/${batchId}/reconciliation/report`, { headers: { Authorization: `Bearer ${techToken}` } });
    assert.equal(repRes.status, 200);
    const rep = await repRes.json();
    assert.equal(rep.technicalOutcome, "PASSED");
    assert.match(rep.businessEquivalence, /PENDING/);
    assert.match(rep.customerAcceptance, /PENDING/);
    assert.ok(rep.sourceSha256 && rep.sourceSha256.length === 64, "report carries the source checksum");
    const repText = await (await fetch(`http://127.0.0.1:18099/api/migration/batches/${batchId}/reconciliation/report?format=text`, { headers: { Authorization: `Bearer ${techToken}` } })).text();
    assert.match(repText, /RECONCILIATION REPORT/);
    assert.match(repText, /Business equivalence: PENDING/);

    // --- Phase 9 (A3/E): server-side buildings pagination ---
    const H = { Authorization: `Bearer ${adminToken}` };
    const seedRes = await fetch("http://127.0.0.1:18099/api/buildings?limit=200", { headers: H });
    const seedCount = (await seedRes.json()).length;
    const pg1 = await (await fetch("http://127.0.0.1:18099/api/buildings?page=1&pageSize=2&sort=id&dir=asc", { headers: H })).json();
    assert.equal(pg1.total, seedCount, "paged total matches seeded buildings");
    assert.equal(pg1.rows.length, Math.min(2, seedCount));
    assert.equal(pg1.pages, Math.max(1, Math.ceil(seedCount / 2)));
    const pg2 = await (await fetch("http://127.0.0.1:18099/api/buildings?page=2&pageSize=2&sort=id&dir=asc", { headers: H })).json();
    if (seedCount > 2) assert.ok(pg2.rows[0].id > pg1.rows[pg1.rows.length - 1].id, "pages advance without overlap");
    const pgDesc = await (await fetch("http://127.0.0.1:18099/api/buildings?page=1&pageSize=2&sort=id&dir=desc", { headers: H })).json();
    assert.ok(pgDesc.rows[0].id >= pg1.rows[pg1.rows.length - 1].id, "desc ordering reverses the set");
    const pgGov = await (await fetch("http://127.0.0.1:18099/api/buildings?page=1&pageSize=100&governorate=1", { headers: H })).json();
    assert.ok(pgGov.rows.every((r: any) => r.governorate_code === 1), "governorate filter is exact");
    const pgQ = await (await fetch("http://127.0.0.1:18099/api/buildings?page=1&pageSize=100&q=%25", { headers: H })).json();
    assert.equal(pgQ.total, 0, "wildcard characters in q are escaped, not pattern-matched");
    const badSort = await fetch("http://127.0.0.1:18099/api/buildings?page=1&sort=id%3BDROP%20TABLE%20app.buildings", { headers: H });
    assert.equal(badSort.status, 400, "non-whitelisted sort is rejected, never interpolated");
    const badDir = await fetch("http://127.0.0.1:18099/api/buildings?page=1&dir=sideways", { headers: H });
    assert.equal(badDir.status, 400);
    const badPage = await fetch("http://127.0.0.1:18099/api/buildings?page=0", { headers: H });
    assert.equal(badPage.status, 400);
    const badSize = await fetch("http://127.0.0.1:18099/api/buildings?page=1&pageSize=5000", { headers: H });
    assert.equal(badSize.status, 400, "pageSize is capped server-side");
    const badGov = await fetch("http://127.0.0.1:18099/api/buildings?page=1&governorate=abc", { headers: H });
    assert.equal(badGov.status, 400);
    const unauthPg = await fetch("http://127.0.0.1:18099/api/buildings?page=1");
    assert.equal(unauthPg.status, 401, "paged mode still requires authentication");

    // --- Phase 10: tenders server-side pagination ---
    const tAll = await (await fetch("http://127.0.0.1:18099/api/tenders", { headers: H })).json();
    const tPg = await (await fetch("http://127.0.0.1:18099/api/tenders?page=1&pageSize=2", { headers: H })).json();
    assert.equal(tPg.total, tAll.length, "tenders paged total matches the full list");
    assert.equal(tPg.rows.length, Math.min(2, tAll.length));
    assert.equal(tPg.rows[0].id, tAll[0].id, "default order remains id DESC");
    const tStage = await (await fetch("http://127.0.0.1:18099/api/tenders?page=1&pageSize=100&stage=draft", { headers: H })).json();
    assert.ok(tStage.rows.every((r: any) => r.stage === "draft"), "stage filter is exact");
    const tBadStage = await fetch("http://127.0.0.1:18099/api/tenders?page=1&stage=banana", { headers: H });
    assert.equal(tBadStage.status, 400, "unknown stage rejected");
    const tBadSort = await fetch("http://127.0.0.1:18099/api/tenders?page=1&sort=title%3BDROP", { headers: H });
    assert.equal(tBadSort.status, 400, "tenders sort whitelist enforced");

    // --- Phase 12: governed pilot activation gate ---
    const fx = readFileSync(new URL("./fixture_extract.bin", import.meta.url));
    const rawImport = (tok: string, cls: string) => fetch(`http://127.0.0.1:18099/api/migration/import?layout=pblbuldg&dataClass=${cls}`, { method: "POST", headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/octet-stream" }, body: fx });
    const refused1 = await rawImport(techToken, "customer");
    assert.equal(refused1.status, 422, "customer-data import refused with no active pilot");
    const pilotByTech = await post("/api/pilots", techToken, { name: "Phase 12 gate test" });
    assert.equal(pilotByTech.status, 403, "pilot creation is admin-only");
    const pilotRes = await post("/api/pilots", adminToken, { name: "Phase 12 gate test", environment: "test" });
    assert.equal(pilotRes.status, 201, "admin creates a pilot");
    const pilotId = (await pilotRes.json()).id;
    const pilotDetail = await (await fetch(`http://127.0.0.1:18099/api/pilots/${pilotId}`, { headers: H })).json();
    assert.equal(pilotDetail.conditions.length, 12, "pilot carries the 12 mandatory conditions");
    assert.ok(pilotDetail.conditions.every((c: any) => c.status === "pending"), "all conditions start pending");
    const earlyActivate = await post(`/api/pilots/${pilotId}/activate`, adminToken, {});
    assert.equal(earlyActivate.status, 422, "activation refused while conditions are missing");
    const earlyBody = await earlyActivate.json();
    assert.ok(Array.isArray(earlyBody.missing) && earlyBody.missing.length >= 10, "refusal lists the missing conditions");
    const attestNoEvidence = await post(`/api/pilots/${pilotId}/conditions/charter_approved/attest`, adminToken, {});
    assert.equal(attestNoEvidence.status, 400, "attestation without an evidence reference is refused");
    const attestByTech = await post(`/api/pilots/${pilotId}/conditions/charter_approved/attest`, techToken, { evidenceRef: "x" });
    assert.equal(attestByTech.status, 403, "attestation is admin-only");
    for (const key of ["charter_approved", "scope_approved", "bd_decisions", "extract_authorization", "environment_approved", "backup_restore_verified", "monitoring_alerts_verified", "transfer_mechanism_approved", "participants_assigned", "security_prerequisites"]) {
      const a = await post(`/api/pilots/${pilotId}/conditions/${key}/attest`, adminToken, { evidenceRef: `integration-test evidence for ${key}` });
      assert.equal(a.status, 200, `attest ${key}`);
    }
    const verifyTooEarly = await post(`/api/pilots/${pilotId}/conditions/transform_approvals/verify`, adminToken, {});
    assert.equal(verifyTooEarly.status, 422, "transform_approvals auto-check fails before customer-mode approvals exist");
    const custApproval = await post("/api/migration/approvals", budgetToken, { transform: "buildings", mode: "customer", evidenceRef: "integration-test signed mapping review" });
    assert.equal(custApproval.status, 200, "customer-mode approval with evidence reference");
    const verifyT = await post(`/api/pilots/${pilotId}/conditions/transform_approvals/verify`, adminToken, {});
    assert.equal(verifyT.status, 200, "transform_approvals verifies against live approvals");
    const verifyEnv = await post(`/api/pilots/${pilotId}/conditions/env_preflight/verify`, adminToken, {});
    assert.equal(verifyEnv.status, 200, "env_preflight verifies against the live database");
    const activate = await post(`/api/pilots/${pilotId}/activate`, adminToken, {});
    assert.equal(activate.status, 200, "activation succeeds when every condition is satisfied");
    const allowed = await rawImport(techToken, "customer");
    assert.equal(allowed.status, 200, "customer-data import proceeds under the active pilot");
    const closeRes = await post(`/api/pilots/${pilotId}/close`, adminToken, {});
    assert.equal(closeRes.status, 200, "pilot closes");
    const refused2 = await rawImport(techToken, "customer");
    assert.equal(refused2.status, 422, "customer-data import refused again after pilot closure");
  } finally { server.kill(); }
}
