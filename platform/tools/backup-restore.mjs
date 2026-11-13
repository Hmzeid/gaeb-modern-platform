// Logical backup/restore validation (Phase 5 Workstream I).
// Exports every migration-evidence and core application table from the source
// database to JSONL files (with per-table row count + SHA-256 fingerprint),
// creates a FRESH database, applies the full migration set + staging schema,
// restores the rows, and verifies counts and fingerprints match exactly.
// This validates logical recoverability of the evidence chain. It is NOT a
// physical-backup (pg_dump/basebackup) certification — the sandbox's
// PostgreSQL distribution ships no pg_dump binary; that check belongs to the
// Docker/host deployment (see docs/release/GAEB_Backup_Restore_Validation.md).
// Usage: SOURCE_URL=postgres://.../gaeb_recovery node tools/backup-restore.mjs <backupDir>
import pg from "pg";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";

const src = process.env.SOURCE_URL;
const dir = process.argv[2];
if (!src || !dir) { console.error("usage: SOURCE_URL=<url> node tools/backup-restore.mjs <backupDir>"); process.exit(2); }
const t0 = Date.now();
const base = src.replace(/\/[^/]+$/, "");
// Restore order respects foreign keys: users before everything that references
// them, batches before rejects, governorates before buildings.
const TABLES = ["app.users", "mig.batches", "mig.batch_runs", "mig.batch_totals", "mig.rejects", "mig.job_state",
  "mig.loaded_keys", "mig.mapping_approvals", "mig.mapping_approval_events", "mig.layouts",
  "mig.intake_datasets", "mig.intake_events", "mig.import_jobs", "mig.import_job_events",
  "app.audit_log", "app.governorates", "app.buildings", "school_map.pblbuldg"];
const fp = (rows) => createHash("sha256").update(rows.map(r => JSON.stringify(r)).join("\n")).digest("hex");

mkdirSync(dir, { recursive: true });
const srcPool = new pg.Pool({ connectionString: src });
const manifest = {};
for (const t of TABLES) {
  const cols = await srcPool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`,
    t.split("."));
  if (!cols.rows.length) { manifest[t] = { rows: 0, note: "table absent in source" }; continue; }
  const names = cols.rows.map(r => r.column_name);
  const data = await srcPool.query(`SELECT ${names.join(", ")} FROM ${t} ORDER BY 1, 2`);
  writeFileSync(`${dir}/${t.replace(".", "_")}.jsonl`, data.rows.map(r => JSON.stringify(r)).join("\n"));
  manifest[t] = { rows: data.rows.length, fingerprint: fp(data.rows), columns: names };
}
await srcPool.end();
writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`backup: ${Object.values(manifest).reduce((a, m) => a + (m.rows ?? 0), 0)} rows across ${TABLES.length} tables in ${Date.now() - t0} ms`);

// Fresh target database + full schema.
const admin = new pg.Pool({ connectionString: `${base}/postgres` });
await admin.query("DROP DATABASE IF EXISTS gaeb_restored");
await admin.query("CREATE DATABASE gaeb_restored");
await admin.end();
const dst = new pg.Pool({ connectionString: `${base}/gaeb_restored` });
const migDir = new URL("../migrations/", import.meta.url);
for (const f of readdirSync(migDir).filter(x => x.endsWith(".sql")).sort())
  await dst.query(readFileSync(new URL(`../migrations/${f}`, import.meta.url), "utf8"));
await dst.query(readFileSync(new URL("../../migration/reconciled/schema_v2.sql", import.meta.url), "utf8"));

let failures = 0;
for (const t of TABLES) {
  const m = manifest[t];
  if (!m || m.note) continue;
  const rows = readFileSync(`${dir}/${t.replace(".", "_")}.jsonl`, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
  const names = m.columns;
  for (const r of rows) {
    const vals = names.map(n => { const v = r[n]; return v !== null && typeof v === "object" ? JSON.stringify(v) : v; });
    await dst.query(`INSERT INTO ${t} (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")})`, vals);
  }
  const back = await dst.query(`SELECT ${names.join(", ")} FROM ${t} ORDER BY 1, 2`);
  const ok = back.rows.length === m.rows && fp(back.rows) === m.fingerprint;
  if (!ok) failures++;
  console.log(`restore ${t}: rows ${back.rows.length}/${m.rows} fingerprint ${fp(back.rows) === m.fingerprint ? "MATCH" : "MISMATCH"}`);
}
await dst.end();
console.log(`total duration: ${Date.now() - t0} ms`);
console.log(failures === 0 ? "BACKUP/RESTORE VALIDATION: PASS" : `BACKUP/RESTORE VALIDATION: FAIL (${failures} tables)`);
process.exit(failures === 0 ? 0 : 1);
