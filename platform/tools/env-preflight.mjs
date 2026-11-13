#!/usr/bin/env node
// GAEB pilot environment preflight (Phase 11, Workstream D).
// Runs automated environment qualification checks against a target
// deployment and emits a JSON + console report. Host-level items that
// cannot be verified from the application tier (TLS certificate
// chain, firewall rules, network segmentation) are reported as
// MANUAL — they require infrastructure attestation, and this tool
// does not pretend otherwise.
//
// Usage: DATABASE_URL=postgres://... API_URL=http://127.0.0.1:18090 \
//        BACKUP_DIR=/var/backups/gaeb node tools/env-preflight.mjs
import os from "node:os";
import fs from "node:fs";
import pgPkg from "pg";
const { Client } = pgPkg;

const checks = [];
const add = (id, name, status, detail) => { checks.push({ id, name, status, detail }); console.log(`${status.padEnd(6)} ${id} ${name} — ${detail}`); };

const dbUrl = process.env.DATABASE_URL;
const apiUrl = process.env.API_URL || "http://127.0.0.1:18090";
const backupDir = process.env.BACKUP_DIR || "";

add("ENV-01", "Operating system", "INFO", `${os.type()} ${os.release()} ${os.arch()}`);
add("ENV-02", "CPU", os.cpus().length >= 2 ? "PASS" : "WARN", `${os.cpus().length} vCPU (pilot minimum 4 recommended)`);
const totalGb = os.totalmem() / 2 ** 30;
add("ENV-03", "Memory", totalGb >= 7.5 ? "PASS" : "WARN", `${totalGb.toFixed(1)} GB total (pilot minimum 8 GB recommended)`);
try {
  const st = fs.statfsSync(process.cwd());
  const freeGb = (st.bavail * st.bsize) / 2 ** 30;
  add("ENV-04", "Disk free (app volume)", freeGb >= 20 ? "PASS" : "WARN", `${freeGb.toFixed(1)} GB free`);
} catch (e) { add("ENV-04", "Disk free (app volume)", "FAIL", String(e.message)); }
const nodeMajor = Number(process.versions.node.split(".")[0]);
add("ENV-05", "Node.js runtime", nodeMajor >= 20 ? "PASS" : "FAIL", `v${process.versions.node} (requires >= 20)`);

if (!dbUrl) { add("ENV-06", "PostgreSQL", "FAIL", "DATABASE_URL not set"); }
else {
  const c = new Client({ connectionString: dbUrl });
  try {
    await c.connect();
    const v = await c.query("SHOW server_version");
    const ver = v.rows[0].server_version;
    add("ENV-06", "PostgreSQL version", ver.startsWith("16") ? "PASS" : "FAIL", `${ver} (requires 16.x)`);
    const ext = await c.query("SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm'");
    add("ENV-07", "pg_trgm extension available", ext.rowCount ? "PASS" : "WARN", ext.rowCount ? "available" : "not available — migration 011 will skip trigram indexes (search falls back to slower scans)");
    const idx = await c.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'app' AND indexname LIKE '%trgm%'");
    add("ENV-08", "Trigram search indexes present", idx.rowCount >= 3 ? "PASS" : "WARN", `${idx.rowCount} trigram indexes on app.buildings (expect 3 after migration 011)`);
    const mig = await c.query("SELECT 1 FROM information_schema.tables WHERE table_schema = 'mig' AND table_name = 'import_jobs'");
    add("ENV-09", "Migration control schema", mig.rowCount ? "PASS" : "FAIL", mig.rowCount ? "mig.import_jobs present (migrations applied)" : "mig schema incomplete — apply platform/migrations in order");
    const clk = await c.query("SELECT EXTRACT(EPOCH FROM (now() - $1::timestamptz)) AS skew", [new Date().toISOString()]);
    const skew = Math.abs(Number(clk.rows[0].skew));
    add("ENV-10", "Clock synchronization (app vs DB)", skew < 5 ? "PASS" : "WARN", `skew ${skew.toFixed(2)}s (NTP discipline is a host responsibility)`);
    await c.end();
  } catch (e) { add("ENV-06", "PostgreSQL", "FAIL", String(e.message)); }
}

try {
  const r = await fetch(`${apiUrl}/health`);
  const body = await r.json().catch(() => ({}));
  add("ENV-11", "API health", r.ok && body.ok ? "PASS" : "FAIL", `${apiUrl}/health -> ${r.status}`);
  const h = r.headers;
  const sec = ["x-content-type-options", "x-frame-options", "content-security-policy"].filter(k => h.get(k));
  add("ENV-12", "API security headers", sec.length === 3 ? "PASS" : "WARN", `${sec.length}/3 present (${sec.join(", ") || "none"})`);
} catch (e) { add("ENV-11", "API health", "FAIL", String(e.message)); }

if (backupDir) {
  try { fs.accessSync(backupDir, fs.constants.W_OK); add("ENV-13", "Backup directory writable", "PASS", backupDir); }
  catch { add("ENV-13", "Backup directory writable", "FAIL", `${backupDir} not writable`); }
} else add("ENV-13", "Backup directory writable", "MANUAL", "BACKUP_DIR not provided");

add("ENV-14", "TLS certificate & reverse proxy", "MANUAL", "attest at the proxy: valid GAEB-issued chain, TLS 1.2+, HTTP->HTTPS redirect");
add("ENV-15", "Network segmentation & firewall", "MANUAL", "attest: only the proxy is public; API/DB ports internal-only");
add("ENV-16", "Secrets management", "MANUAL", "attest: credentials injected by host secret mechanism; none in the repository or images");

const fails = checks.filter(c => c.status === "FAIL").length;
const report = { generatedAt: new Date().toISOString(), apiUrl, summary: { pass: checks.filter(c => c.status === "PASS").length, warn: checks.filter(c => c.status === "WARN").length, fail: fails, manual: checks.filter(c => c.status === "MANUAL").length }, checks };
const out = process.env.OUT || "";
if (out) fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\nPREFLIGHT: ${report.summary.pass} pass, ${report.summary.warn} warn, ${fails} fail, ${report.summary.manual} manual`);
process.exit(fails ? 1 : 0);
