// Executable operational health check (Phase 7, Workstream I). Exits 0 when
// every check passes, 1 otherwise, printing one JSON object — designed to be
// wired to any alerting destination (cron + mail, monitoring agent, webhook
// shim). The CHECKS are executable and tested; delivery to a specific
// alerting destination is a deployment configuration, not claimed here.
// Usage: DATABASE_URL=... API_URL=http://127.0.0.1:8080 node tools/health-check.mjs
import pg from "pg";

const dbUrl = process.env.DATABASE_URL;
const apiUrl = process.env.API_URL ?? "http://127.0.0.1:8080";
const checks = [];
const check = (name, ok, detail) => checks.push({ name, ok, detail });

if (dbUrl) {
  const pool = new pg.Pool({ connectionString: dbUrl });
  try {
    await pool.query("SELECT 1");
    check("database reachable", true, "SELECT 1 ok");
    const failed = await pool.query("SELECT count(*)::int n FROM mig.import_jobs WHERE state='FAILED'");
    check("no failed import jobs", failed.rows[0].n === 0, `${failed.rows[0].n} FAILED jobs`);
    const stuck = await pool.query(
      "SELECT count(*)::int n FROM mig.import_jobs WHERE state IN ('RUNNING','RECONCILING') AND lease_expires_at IS NOT NULL AND lease_expires_at < now()");
    check("no stalled jobs (expired leases)", stuck.rows[0].n === 0, `${stuck.rows[0].n} jobs with expired leases`);
    const recent = await pool.query(
      "SELECT COALESCE(SUM(loaded),0)::int l, COALESCE(SUM(rejected),0)::int r FROM mig.batches WHERE started_at > now() - interval '24 hours'");
    const { l, r } = recent.rows[0];
    check("quarantine ratio (24h) below 20%", l + r === 0 || r / (l + r) < 0.2,
      `loaded ${l}, quarantined ${r} in the last 24h`);
    const size = await pool.query("SELECT pg_database_size(current_database()) AS b");
    check("database size below 85% of the 10 GB pilot budget", Number(size.rows[0].b) < 0.85 * 10 * 1024 ** 3,
      `${(Number(size.rows[0].b) / 1024 ** 3).toFixed(2)} GB`);
  } catch (e) { check("database reachable", false, String(e.message ?? e)); }
  await pool.end().catch(() => {});
} else check("database reachable", false, "DATABASE_URL not set");

try {
  const r = await fetch(`${apiUrl}/health`);
  const j = await r.json();
  check("api health endpoint", r.ok && j.ok === true, `HTTP ${r.status}`);
} catch (e) { check("api health endpoint", false, String(e.message ?? e)); }

const failed = checks.filter(c => !c.ok);
console.log(JSON.stringify({ at: new Date().toISOString(), ok: failed.length === 0, checks }, null, 1));
process.exit(failed.length === 0 ? 0 : 1);
