#!/usr/bin/env node
/**
 * Phase 9 (Workstreams C + A3): enterprise-scale validation harness.
 *
 * Builds a scratch database `gaeb_scale` with a deterministic synthetic
 * registry (NO customer data), starts the real API against it, and
 * measures the paged School Map endpoint and the aggregation endpoints.
 *
 * Usage: node tools/phase9-scale.mjs [buildingsCount]
 * Env:   PGHOST/PGPORT/PGUSER as for psql (defaults 127.0.0.1:54399, gaeb)
 *
 * Deterministic: governorate assignment and names derive from the row
 * number via md5, so re-runs reproduce the same dataset.
 */
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import pgPkg from "pg";
const { Client } = pgPkg;

const N = Number(process.argv[2] ?? 1000000);
const HOST = process.env.PGHOST ?? "127.0.0.1";
const PORT = process.env.PGPORT ?? "54399";
const USER = process.env.PGUSER ?? "gaeb";
const base = `postgres://${USER}@${HOST}:${PORT}`;
const API_PORT = 18091;

const sql = async (client, text, params) => client.query(text, params);

async function main() {
  const admin = new Client({ connectionString: `${base}/postgres` });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS gaeb_scale`);
  await admin.query(`CREATE DATABASE gaeb_scale`);
  await admin.end();

  const db = new Client({ connectionString: `${base}/gaeb_scale` });
  await db.connect();
  for (const f of ["001_operational_schema.sql", "002_estimates.sql", "003_migration_meta.sql", "004_migration_integrity.sql", "005_transform_keys.sql", "006_secure_approvals.sql", "007_intake.sql", "008_scalable_checkpoint.sql", "009_import_jobs.sql", "010_buildings_pagination_indexes.sql", "011_buildings_trigram_search.sql"]) {
    await db.query(readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf8"));
  }
  // Governorates from the certified boundary asset + the explicit
  // GAEB->P-code table in the frontend source (single source of truth).
  const asset = JSON.parse(readFileSync(new URL("../frontend/src/assets/egypt-adm1.json", import.meta.url), "utf8"));
  const geoSrc = readFileSync(new URL("../frontend/src/geo-data.ts", import.meta.url), "utf8");
  const govMap = {};
  for (const m of geoSrc.matchAll(/(\d+):\s*"(EG\d+)"/g)) govMap[m[2]] = Number(m[1]);
  const govs = asset.features.map(f => ({
    code: govMap[f.properties.pcode], en: f.properties.name_en, ar: f.properties.name_ar,
  })).filter(g => g.code !== undefined);
  if (govs.length !== 27) throw new Error(`expected 27 governorates, got ${govs.length}`);
  for (const g of govs) {
    await db.query("INSERT INTO app.governorates (code, name_en, name_ar, regional_center) VALUES ($1,$2,$3,$4)",
      [g.code, g.en, g.ar, Math.ceil(g.code / 4)]);
  }
  const codes = govs.map(g => g.code);
  // Weighted governorate picker: Cairo(1), Giza(21), Alexandria(2) heavy.
  const weighted = [1, 1, 1, 21, 21, 2, 2, ...codes];
  const pickGov = n => `(ARRAY[${weighted.join(",")}])[1 + (('x'||substr(md5(${n}::text),1,8))::bit(32)::bigint % ${weighted.length})::int]`;

  const stems = ["النيل", "السلام", "المستقبل", "النور", "الأمل", "الحرية", "الجمهورية", "الوحدة", "النهضة", "التحرير"];
  const batch = 100000;
  const t0 = Date.now();
  for (let from = 1; from <= N; from += batch) {
    const to = Math.min(N, from + batch - 1);
    await db.query(`
      INSERT INTO app.buildings (legacy_blcd, name_en, name_ar, governorate_code, center_code, village_code, stage_code, plot_area, building_area, floors, classrooms)
      SELECT 'BL' || (2000000 + n), 'School No. ' || n,
             'مدرسة ' || (ARRAY['${stems.join("','")}'])[1 + n % ${stems.length}] || ' رقم ' || n,
             ${pickGov("n")}, 1 + n % 40, 1 + n % 300, 1 + n % 45,
             500 + (n % 4000), 300 + (n % 2500), 1 + n % 5, 6 + n % 36
      FROM generate_series($1::bigint, $2::bigint) AS n`, [from, to]);
    process.stdout.write(`\rbuildings ${to}/${N}`);
  }
  const tenders = Math.min(20000, Math.max(2000, Math.floor(N / 50)));
  const stages = ["draft", "booklet", "published", "bids_open", "bids_closed", "exclusion_review", "envelope_committee", "financial_evaluation", "award_committee", "negotiation", "awarded", "contracted"];
  await db.query(`
    INSERT INTO app.tenders (legacy_type, legacy_no, title, stage)
    SELECT 1 + n % 3, 900000 + n, 'Tender ' || n, (ARRAY['${stages.join("','")}'])[1 + n % 12]
    FROM generate_series(1, $1::bigint) AS n`, [tenders]);
  await db.query(`
    INSERT INTO app.audit_log (user_id, action, entity, entity_id)
    SELECT NULL, 'scale.seed', 'building', n::text FROM generate_series(1, 50000) AS n`);
  await db.query("ANALYZE app.buildings");
  const genMs = Date.now() - t0;
  console.log(`\ngenerated: buildings=${N} tenders=${tenders} audit=50000 in ${genMs} ms`);

  // Query plans for the paged endpoint's SQL shapes.
  const plans = {};
  const planFor = async (label, text, params) => {
    const r = await db.query(`EXPLAIN (ANALYZE, COSTS OFF, SUMMARY ON) ${text}`, params);
    plans[label] = r.rows.map(x => x["QUERY PLAN"].trim()).slice(0, 8);
  };
  await planFor("page1_sort_id", "SELECT * FROM app.buildings ORDER BY id ASC LIMIT 25 OFFSET 0", []);
  await planFor("deep_page_sort_id", "SELECT * FROM app.buildings ORDER BY id ASC LIMIT 25 OFFSET 999975", []);
  await planFor("gov_filter", "SELECT * FROM app.buildings WHERE governorate_code = 1 ORDER BY id ASC LIMIT 25 OFFSET 0", []);
  await planFor("count_all", "SELECT COUNT(*)::int FROM app.buildings", []);
  await planFor("count_gov", "SELECT COUNT(*)::int FROM app.buildings WHERE governorate_code = 1", []);
  await planFor("search_substring", "SELECT * FROM app.buildings WHERE name_en ILIKE '%School No. 999%' ORDER BY id ASC LIMIT 25 OFFSET 0", []);
  await db.end();

  // API server against the scale database.
  execFileSync("node", ["dist/src/cli/create-admin.js", "scale-admin", "scale-admin-123"], {
    env: { ...process.env, DATABASE_URL: `${base}/gaeb_scale` }, stdio: "pipe",
    cwd: new URL("..", import.meta.url).pathname,
  });
  const server = spawn("node", ["dist/src/server.js"], {
    env: { ...process.env, DATABASE_URL: `${base}/gaeb_scale`, PORT: String(API_PORT) },
    cwd: new URL("..", import.meta.url).pathname, stdio: "ignore",
  });
  try {
    let up = false;
    for (let i = 0; i < 50 && !up; i++) {
      try { const r = await fetch(`http://127.0.0.1:${API_PORT}/health`); up = r.ok; } catch { await new Promise(r => setTimeout(r, 200)); }
    }
    if (!up) throw new Error("scale API did not start");
    const login = await (await fetch(`http://127.0.0.1:${API_PORT}/api/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "scale-admin", password: "scale-admin-123" }),
    })).json();
    const H = { Authorization: `Bearer ${login.token}` };
    const measure = async (label, url, samples = 30) => {
      const times = [];
      let bytes = 0;
      for (let i = 0; i < samples; i++) {
        const a = performance.now();
        const r = await fetch(`http://127.0.0.1:${API_PORT}${url}`, { headers: H });
        const body = await r.text(); bytes = body.length;
        times.push(performance.now() - a);
        if (!r.ok) throw new Error(`${label}: HTTP ${r.status}`);
      }
      times.sort((x, y) => x - y);
      const pct = p => times[Math.min(times.length - 1, Math.floor(p * times.length))];
      return { label, samples, p50: +pct(0.5).toFixed(1), p95: +pct(0.95).toFixed(1), p99: +pct(0.99).toFixed(1), max: +times[times.length - 1].toFixed(1), responseBytes: bytes };
    };
    const lastPage = Math.ceil(N / 25);
    const results = [];
    results.push(await measure("buildings page 1 (sort id)", "/api/buildings?page=1&pageSize=25&sort=id&dir=asc"));
    results.push(await measure("buildings last page (sort id)", `/api/buildings?page=${lastPage}&pageSize=25&sort=id&dir=asc`));
    results.push(await measure("buildings page 1 sort name_en", "/api/buildings?page=1&pageSize=25&sort=name_en&dir=asc"));
    results.push(await measure("buildings governorate=1 page 1", "/api/buildings?page=1&pageSize=25&governorate=1"));
    results.push(await measure("buildings search 'School No. 999'", "/api/buildings?page=1&pageSize=25&q=" + encodeURIComponent("School No. 999")));
    results.push(await measure("buildings legacy mode limit=200", "/api/buildings?limit=200"));
    results.push(await measure("reports buildings-by-governorate", "/api/reports/buildings-by-governorate"));
    results.push(await measure("overview", "/api/overview"));
    results.push(await measure("tenders list (all)", "/api/tenders", 10));
    results.push(await measure("audit list (limit 200)", "/api/audit", 10));
    console.log(JSON.stringify({ buildings: N, tenders, generationMs: genMs, results, plans }, null, 1));
  } finally { server.kill(); }
}
main().catch(e => { console.error("SCALE FAILED:", e.message); process.exit(1); });
