import type { DecodedRecord, ImportReport } from "./engine.js";

// Persistence layer for the migration engine. The SQL builders are pure functions
// (unit-tested); the executor is a thin pg wrapper that runs only against a live
// database — it is intentionally not exercised by the unit suite (see milestone report).

export interface Parameterized { text: string; values: unknown[] }

/** Build one parameterized INSERT for a staging table. Column names come from the
 *  layout (never from user input); every record also carries lineage columns:
 *  _batch_id, _raw_hex (the untouched source bytes), so any staged row can be
 *  traced back to its batch and exact source record (Directive §5). */
export function buildStagingInsert(schemaTable: string, batchId: string, rec: DecodedRecord): Parameterized {
  if (!/^[a-z_]+\.[a-z0-9_]+$/.test(schemaTable)) throw new Error(`unsafe staging table name: ${schemaTable}`);
  const cols = Object.keys(rec.values);
  for (const c of cols) if (!/^[a-z0-9_]+$/i.test(c)) throw new Error(`unsafe column name: ${c}`);
  const all = [...cols, "_batch_id", "_source_offset", "_raw_hex"];
  const placeholders = all.map((_, i) => `$${i + 1}`).join(", ");
  return {
    // Database-level idempotency: a retried batch re-inserts nothing — the unique
    // index ux_<table>_batch_offset on (_batch_id, _source_offset) absorbs replays.
    text: `INSERT INTO ${schemaTable} (${all.join(", ")}) VALUES (${placeholders}) ON CONFLICT (_batch_id, _source_offset) DO NOTHING`,
    values: [...cols.map(c => rec.values[c]), batchId, rec.offset, rec.raw],
  };
}

export function buildBatchInsert(report: ImportReport, sourceFile: string, layoutName: string): Parameterized {
  return {
    text: `INSERT INTO mig.batches (batch_id, source_file, source_sha256, layout_name, total_records, loaded, rejected, control_totals, source_totals, finished_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now()) ON CONFLICT (batch_id) DO UPDATE SET loaded = EXCLUDED.loaded, rejected = EXCLUDED.rejected, control_totals = EXCLUDED.control_totals, source_totals = EXCLUDED.source_totals, finished_at = now()`,
    values: [report.batchId, sourceFile, report.sourceSha256, layoutName, report.totalRecords, report.loaded,
      report.rejected.length, JSON.stringify(report.controlTotals), JSON.stringify(report.sourceTotals)],
  };
}

export function buildRejectInserts(report: ImportReport): Parameterized[] {
  return report.rejected.map(r => ({
    text: "INSERT INTO mig.rejects (batch_id, record_offset, reason, raw_hex) VALUES ($1,$2,$3,$4) ON CONFLICT (batch_id, record_offset) DO NOTHING",
    values: [report.batchId, r.offset, r.reason, r.rawHex],
  }));
}

export interface SqlExecutor { query(text: string, values?: unknown[]): Promise<unknown> }

/** Persist a finished import: batch summary, rejects, then staged records — one transaction. */
export async function persistImport(db: SqlExecutor, schemaTable: string, sourceFile: string, layoutName: string,
  records: DecodedRecord[], report: ImportReport): Promise<void> {
  await db.query("BEGIN");
  try {
    const b = buildBatchInsert(report, sourceFile, layoutName);
    await db.query(b.text, b.values);
    for (const r of buildRejectInserts(report)) await db.query(r.text, r.values);
    for (const rec of records) { const q = buildStagingInsert(schemaTable, report.batchId, rec); await db.query(q.text, q.values); }
    await db.query("COMMIT");
  } catch (e) { await db.query("ROLLBACK"); throw e; }
}

// Job checkpoints live in mig.job_state so an interrupted import resumes from the
// database, not from a local file (Directive: persist and restore checkpoints).
import type { JobState } from "./engine.js";
export interface QueryExecutor { query(text: string, values?: unknown[]): Promise<{ rows: any[] }> }
export async function loadJobState(db: QueryExecutor, batchId: string): Promise<JobState> {
  const { rows } = await db.query("SELECT next_offset, loaded_keys FROM mig.job_state WHERE batch_id = $1", [batchId]);
  if (!rows.length) return { batchId, nextOffset: 0, loadedKeys: [] };
  return { batchId, nextOffset: rows[0].next_offset, loadedKeys: rows[0].loaded_keys ?? [] };
}
export function buildJobStateSave(state: JobState): Parameterized {
  return { text: `INSERT INTO mig.job_state (batch_id, next_offset, loaded_keys, updated_at) VALUES ($1,$2,$3, now())
                  ON CONFLICT (batch_id) DO UPDATE SET next_offset = EXCLUDED.next_offset, loaded_keys = EXCLUDED.loaded_keys, updated_at = now()`,
           values: [state.batchId, state.nextOffset, JSON.stringify(state.loadedKeys)] };
}
