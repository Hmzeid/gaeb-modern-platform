// Phase 7 Workstream D.3 — point-in-time recovery drill on a DEDICATED cluster.
// Sequence (textbook PITR): start a cluster with WAL archiving ON -> create the
// platform schema -> base backup -> transaction A -> capture recovery target
// timestamp -> transaction B -> stop -> restore base backup with
// recovery_target_time -> verify A present, B absent, DB consistent.
// The drill cluster uses its own data dir/ports and never touches other DBs.
// Usage: node tools/pitr-drill.mjs   (logs are the caller's responsibility)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync, cpSync, readFileSync, readdirSync, appendFileSync } from "node:fs";
import pg from "pg";

const PG_BIN = `${process.env.HOME}/workspace/tools/pg/bin`;
const ROOT = `${process.env.HOME}/workspace/tools/pitr`;
const DATA = `${ROOT}/data`, ARCH = `${ROOT}/wal-archive`, BASE = `${ROOT}/basebackup`, REST = `${ROOT}/restored`;
const SOCK = "/tmp/pgsock-pitr", SOCK2 = "/tmp/pgsock-pitr2";
const PORT = 54411, PORT2 = 54412;

const un = (bin, args, opts = {}) => execFileSync("unshare",
  ["--user", "--map-user=1000", "--map-group=1000", `${PG_BIN}/${bin}`, ...args],
  { stdio: "pipe", encoding: "utf8", ...opts });
const ctl = (dir, port, sock, action, extra = []) => {
  const args = ["-D", dir, "-l", `${dir}.log`, "-o", `-p ${port} -k ${sock} -c listen_addresses=127.0.0.1 ${extra.join(" ")}`, action];
  return un("pg_ctl", args);
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function waitReady(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const c = new pg.Client({ connectionString: url }); await c.connect(); await c.end(); return; }
    catch { await sleep(1000); }
  }
  throw new Error(`server at ${url} did not become ready`);
}

for (const d of [ROOT, ARCH, SOCK, SOCK2]) mkdirSync(d, { recursive: true });
if (existsSync(DATA)) { try { ctl(DATA, PORT, SOCK, "stop", ["-m", "immediate"]); } catch {} rmSync(DATA, { recursive: true, force: true }); }
if (existsSync(REST)) { try { ctl(REST, PORT2, SOCK2, "stop", ["-m", "immediate"]); } catch {} }
rmSync(BASE, { recursive: true, force: true }); rmSync(REST, { recursive: true, force: true });
rmSync(ARCH, { recursive: true, force: true }); mkdirSync(ARCH, { recursive: true });

console.log("== initdb drill cluster ==");
un("initdb", ["-D", DATA, "-U", "gaeb"]);
writeFileSync(`${DATA}/postgresql.conf`, readFileSync(`${DATA}/postgresql.conf`, "utf8") +
  `\narchive_mode = 'on'\narchive_command = 'test ! -f ${ARCH}/%f && cp %p ${ARCH}/%f'\nwal_level = 'replica'\n`);
ctl(DATA, PORT, SOCK, "start");
const src = `postgres://gaeb@127.0.0.1:${PORT}/postgres`;
await waitReady(src);
const admin = new pg.Pool({ connectionString: src });
await admin.query("CREATE DATABASE gaeb_pitr");
await admin.end();

console.log("== apply platform schema ==");
// rr-setup targets fixed DBs; apply migrations directly instead:
const pool = new pg.Pool({ connectionString: `postgres://gaeb@127.0.0.1:${PORT}/gaeb_pitr` });
const migDir = new URL("../migrations/", import.meta.url).pathname;
for (const f of readdirSync(migDir).filter(x => x.endsWith(".sql")).sort()) await pool.query(readFileSync(`${migDir}/${f}`, "utf8"));
await pool.query(readFileSync(new URL("../../migration/reconciled/schema_v2.sql", import.meta.url), "utf8"));
console.log("   schema applied");

console.log("== base backup (archiving on) ==");
const t0 = Date.now();
execFileSync("unshare", ["--user", "--map-user=1000", "--map-group=1000", "pg_basebackup",
  "-h", "127.0.0.1", "-p", String(PORT), "-U", "gaeb", "-D", BASE, "-c", "fast"], { stdio: "inherit" });
console.log(`   base backup in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

console.log("== transaction A (before target) ==");
await pool.query("INSERT INTO app.governorates (code, name_en, name_ar, regional_center) VALUES (901, 'PITR Before Target', 'قبل الهدف', 1)");
await pool.query("INSERT INTO mig.batches (batch_id, source_file, source_sha256, layout_name, total_records, loaded, rejected) VALUES ('pitr-marker-a', 'drill', 'sa', 'pitr', 0, 0, 0)");
const tgt = await pool.query("SELECT now() AS t");
const target = tgt.rows[0].t;
console.log(`   recovery target: ${target.toISOString()}`);
await sleep(1100);
console.log("== transaction B (after target) ==");
await pool.query("INSERT INTO app.governorates (code, name_en, name_ar, regional_center) VALUES (902, 'PITR After Target', 'بعد الهدف', 1)");
await pool.query("INSERT INTO mig.batches (batch_id, source_file, source_sha256, layout_name, total_records, loaded, rejected) VALUES ('pitr-marker-b', 'drill', 'sb', 'pitr', 0, 0, 0)");
await pool.query("CHECKPOINT");
await pool.end();
ctl(DATA, PORT, SOCK, "stop");
console.log("   source cluster stopped");

console.log("== restore to target ==");
cpSync(BASE, REST, { recursive: true });
writeFileSync(`${REST}/recovery.signal`, "");
appendFileSync(`${REST}/postgresql.auto.conf`,
  `\nrestore_command = 'cp ${ARCH}/%f %p'\nrecovery_target_time = '${target.toISOString().replace('T', ' ').replace('Z', '+00')}'\nrecovery_target_action = 'promote'\n`);
const t1 = Date.now();
ctl(REST, PORT2, SOCK2, "start");
const dst = `postgres://gaeb@127.0.0.1:${PORT2}/gaeb_pitr`;
await waitReady(dst);
// The restored server accepts read-only connections DURING recovery; the
// drill must wait for promotion (recovery finished) before verifying.
for (let i = 0; i < 120; i++) {
  try { const c = new pg.Client({ connectionString: dst }); await c.connect();
    const r = await c.query("SELECT pg_is_in_recovery() AS rec"); await c.end();
    if (!r.rows[0].rec) break; } catch { /* not up yet */ }
  await sleep(1000);
}
const restoreMs = Date.now() - t1;
const rp = new pg.Pool({ connectionString: dst });
const a = await rp.query("SELECT count(*)::int n FROM app.governorates WHERE code=901");
const b = await rp.query("SELECT count(*)::int n FROM app.governorates WHERE code=902");
const ba = await rp.query("SELECT count(*)::int n FROM mig.batches WHERE batch_id='pitr-marker-a'");
const bb = await rp.query("SELECT count(*)::int n FROM mig.batches WHERE batch_id='pitr-marker-b'");
const timeline = await rp.query("SELECT pg_is_in_recovery() AS lsn");
await rp.end();
console.log(`   restored cluster ready in ${(restoreMs / 1000).toFixed(1)}s; A governorate=${a.rows[0].n} batch=${ba.rows[0].n}; B governorate=${b.rows[0].n} batch=${bb.rows[0].n}; lsn=${timeline.rows[0].lsn}`);
const pass = a.rows[0].n === 1 && ba.rows[0].n === 1 && b.rows[0].n === 0 && bb.rows[0].n === 0;
try { ctl(REST, PORT2, SOCK2, "stop"); } catch {}
console.log(JSON.stringify({ target: target.toISOString(), baseBackupMs: null, restoreReadyMs: restoreMs, aPresent: a.rows[0].n === 1, bAbsent: b.rows[0].n === 0 }));
console.log(pass ? "PITR DRILL: PASS" : "PITR DRILL: FAIL");
process.exit(pass ? 0 : 1);
