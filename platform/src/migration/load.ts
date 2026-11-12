import type { DecodedRecord, ImportReport, JobState } from "./engine.js";

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

export function buildBatchInsert(report: ImportReport, sourceFile: string, layoutName: string, opts: { dataClass?: string; importedByUserId?: number | null } = {}): Parameterized {
  return {
    // data_class and importer are written by the FIRST run that creates the batch and
    // never overwritten by retries (they are provenance, not progress).
    text: `INSERT INTO mig.batches (batch_id, source_file, source_sha256, layout_name, total_records, loaded, rejected, control_totals, source_totals, data_class, imported_by_user_id, finished_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now()) ON CONFLICT (batch_id) DO UPDATE SET loaded = mig.batches.loaded + EXCLUDED.loaded, rejected = mig.batches.rejected + EXCLUDED.rejected, finished_at = now()`,
    values: [report.batchId, sourceFile, report.sourceSha256, layoutName, report.totalRecords, report.loaded,
      report.rejected.length, JSON.stringify(report.controlTotals), JSON.stringify(report.sourceTotals),
      opts.dataClass ?? "synthetic", opts.importedByUserId ?? null],
  };
}

export function buildRejectInserts(report: ImportReport): Parameterized[] {
  return report.rejected.map(r => ({
    text: "INSERT INTO mig.rejects (batch_id, record_offset, reason, raw_hex) VALUES ($1,$2,$3,$4) ON CONFLICT (batch_id, record_offset) DO NOTHING",
    values: [report.batchId, r.offset, r.reason, r.rawHex],
  }));
}

export interface SqlExecutor { query(text: string, values?: unknown[]): Promise<unknown> }

/** Persist a finished import run — fully atomic on the caller's single connection:
 *  run ledger + cumulative batch totals + rejects + staged records + job checkpoint
 *  commit or roll back together.
 *  Replay safety: the run is keyed by (batch_id, start_offset, source_sha256) in
 *  mig.batch_runs. If that run already committed, persist is a no-op — cumulative
 *  totals can never be overwritten by a retry's partial figures, and can never be
 *  double-counted. Totals accumulate in mig.batch_totals only for newly recorded runs. */
export async function persistImport(db: { query(text: string, values?: unknown[]): Promise<any> },
  schemaTable: string, sourceFile: string, layoutName: string,
  records: DecodedRecord[], report: ImportReport, jobState?: JobState, batchOpts: { dataClass?: string; importedByUserId?: number | null } = {}): Promise<{ alreadyRecorded: boolean }> {
  await db.query("BEGIN");
  try {
    const run = await db.query(
      `INSERT INTO mig.batch_runs (batch_id, start_offset, source_sha256, loaded, rejected_new)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (batch_id, start_offset, source_sha256) DO NOTHING RETURNING id`,
      [report.batchId, report.startOffset, report.sourceSha256, report.loaded, report.rejected.length]);
    if (!run.rows.length) { await db.query("COMMIT"); return { alreadyRecorded: true }; }
    const b = buildBatchInsert(report, sourceFile, layoutName, batchOpts);
    await db.query(b.text, b.values);
    // cumulative totals: add this run's slice exactly once
    for (const [kind, totals] of [["control", report.controlTotals], ["source", report.sourceTotals]] as const)
      for (const [field, amount] of Object.entries(totals))
        await db.query(
          `INSERT INTO mig.batch_totals (batch_id, field, kind, amount) VALUES ($1,$2,$3,$4)
           ON CONFLICT (batch_id, field, kind) DO UPDATE SET amount = mig.batch_totals.amount + EXCLUDED.amount`,
          [report.batchId, field, kind, amount]);
    for (const r of buildRejectInserts(report)) await db.query(r.text, r.values);
    for (const rec of records) { const q = buildStagingInsert(schemaTable, report.batchId, rec); await db.query(q.text, q.values); }
    if (jobState) { const s = buildJobStateSave(jobState); await db.query(s.text, s.values); }
    await db.query("COMMIT");
    return { alreadyRecorded: false };
  } catch (e) { await db.query("ROLLBACK"); throw e; }
}

export function buildJobStateSave(state: JobState): Parameterized {
  return { text: `INSERT INTO mig.job_state (batch_id, next_offset, loaded_keys, updated_at)
    VALUES ($1,$2,$3, now()) ON CONFLICT (batch_id) DO UPDATE SET next_offset = EXCLUDED.next_offset, loaded_keys = EXCLUDED.loaded_keys, updated_at = now()`,
    values: [state.batchId, state.nextOffset, JSON.stringify(state.loadedKeys)] };
}
export async function loadJobState(db: SqlExecutor, batchId: string): Promise<JobState> {
  const r = await (db as any).query("SELECT next_offset, loaded_keys FROM mig.job_state WHERE batch_id = $1", [batchId]) as { rows: any[] };
  if (!r.rows.length) return { batchId, nextOffset: 0, loadedKeys: [] };
  return { batchId, nextOffset: Number(r.rows[0].next_offset), loadedKeys: (typeof r.rows[0].loaded_keys === 'string' ? JSON.parse(r.rows[0].loaded_keys) : r.rows[0].loaded_keys) as string[] };
}
