// Shared per-table fingerprinting for the backup/restore validations:
// for each table, rows (ordered deterministically) are hashed with SHA-256
// over their JSON serialization. Equal fingerprints = identical content.
import pg from "pg";
import { createHash } from "node:crypto";

export const EVIDENCE_TABLES = ["app.users", "mig.batches", "mig.batch_runs", "mig.batch_totals", "mig.rejects",
  "mig.job_state", "mig.loaded_keys", "mig.mapping_approvals", "mig.mapping_approval_events", "mig.layouts",
  "mig.intake_datasets", "mig.intake_events", "mig.import_jobs", "mig.import_job_events",
  "app.audit_log", "app.governorates", "app.buildings", "school_map.pblbuldg"];

export async function fingerprintDb(connectionString, tables = EVIDENCE_TABLES) {
  const pool = new pg.Pool({ connectionString });
  const out = {};
  for (const t of tables) {
    const cols = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 ORDER BY ordinal_position`,
      t.split("."));
    if (!cols.rows.length) { out[t] = { rows: 0, note: "absent" }; continue; }
    const names = cols.rows.map(r => r.column_name);
    const data = await pool.query(`SELECT ${names.join(", ")} FROM ${t} ORDER BY 1, 2`);
    out[t] = { rows: data.rows.length,
      fingerprint: createHash("sha256").update(data.rows.map(r => JSON.stringify(r)).join("\n")).digest("hex") };
  }
  await pool.end();
  return out;
}

export function compareFingerprints(a, b, tables = EVIDENCE_TABLES) {
  const diffs = [];
  for (const t of tables) {
    const x = a[t], y = b[t];
    if (!x || !y || x.rows !== y.rows || x.fingerprint !== y.fingerprint) diffs.push(t);
  }
  return diffs;
}
