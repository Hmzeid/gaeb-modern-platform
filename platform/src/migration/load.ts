import type { DecodedRecord, ImportReport, JobState, Layout, RejectedRecord } from "./engine.js";
import { money } from "../money.js";

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

/** O(1) streaming checkpoint: offset + key count only. The key set itself lives
 *  in mig.loaded_keys and is never re-serialized. */
export async function loadStreamCheckpoint(db: SqlExecutor, batchId: string): Promise<{ nextOffset: number; keyCount: number }> {
  const r = await (db as any).query("SELECT next_offset, key_count FROM mig.job_state WHERE batch_id = $1", [batchId]) as { rows: any[] };
  if (!r.rows.length) return { nextOffset: 0, keyCount: 0 };
  return { nextOffset: Number(r.rows[0].next_offset), keyCount: Number(r.rows[0].key_count) };
}

export interface ChunkInput {
  batchId: string; sourceSha256: string; sourceFile: string; layoutName: string;
  schemaTable: string; layout: Layout;
  startOffset: number; nextOffset: number; totalRecords: number;
  candidates: DecodedRecord[];            // parsed OK, chunk-locally deduplicated
  parseRejects: RejectedRecord[];          // undecodable records in this chunk
  sourceTotals: Record<string, string>;    // sums over ALL parsed records in the chunk (incl. cross-chunk duplicates)
  dataClass?: string; importedByUserId?: number | null;
}

/** Persist one streaming chunk — the scalable replacement for persistImport on
 *  the large-file path. Same atomicity contract (run ledger, cumulative batch
 *  totals, rejects, staging, checkpoint — one transaction, one connection) plus:
 *  - a per-batch advisory lock, so two workers can never advance the same
 *    batch checkpoint concurrently (the loser sees the run already recorded);
 *  - cross-chunk duplicate detection against mig.loaded_keys, incrementally:
 *    only this chunk's keys are written, so commit cost is O(chunk), never
 *    O(history). Duplicates discovered here are quarantined in the same
 *    transaction and control totals are computed over the ACCEPTED subset
 *    only, so the accounting stays exact;
 *  - the checkpoint write is O(1): next_offset + key_count. */
export async function persistChunk(db: { query(text: string, values?: unknown[]): Promise<any> },
  c: ChunkInput): Promise<{ alreadyRecorded: boolean; accepted: number; duplicates: number }> {
  const keyFields = c.layout.fields.filter(f => f.key);
  const numericFields = c.layout.fields.filter(f => f.type === "packed" || f.type === "zoned");
  const keyOf = (rec: DecodedRecord) => keyFields.map(f => rec.values[f.name]).join("|");
  await db.query("BEGIN");
  try {
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`chunk:${c.batchId}`]);
    const run = await db.query(
      `INSERT INTO mig.batch_runs (batch_id, start_offset, source_sha256, loaded, rejected_new)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (batch_id, start_offset, source_sha256) DO NOTHING RETURNING id`,
      [c.batchId, c.startOffset, c.sourceSha256, 0, 0]);
    if (!run.rows.length) { await db.query("COMMIT"); return { alreadyRecorded: true, accepted: 0, duplicates: 0 }; }

    // Cross-chunk duplicate detection, incremental against the keys table.
    let accepted = c.candidates; const dupRejects: RejectedRecord[] = [];
    if (keyFields.length && c.candidates.length) {
      const keys = c.candidates.map(keyOf);
      const vals = keys.map((_, i) => `($1, $${i + 2})`).join(", ");
      const ins = await db.query(
        `INSERT INTO mig.loaded_keys (batch_id, key_value) VALUES ${vals} ON CONFLICT DO NOTHING RETURNING key_value`,
        [c.batchId, ...keys]);
      const fresh = new Set(ins.rows.map((r: any) => r.key_value));
      accepted = []; const seenFresh = new Set<string>();
      for (const rec of c.candidates) {
        const k = keyOf(rec);
        if (fresh.has(k) && !seenFresh.has(k)) { accepted.push(rec); seenFresh.add(k); }
        else dupRejects.push({ offset: rec.offset, reason: `duplicate key ${k}`, rawHex: rec.raw });
      }
    }
    // Control totals over the accepted subset only — exact decimal, as always.
    const controlTotals: Record<string, string> = {};
    for (const f of numericFields) {
      let sum = money("0");
      for (const rec of accepted) sum = sum.plus(rec.values[f.name]);
      controlTotals[f.name] = sum.toString();
    }
    const rejected = [...c.parseRejects, ...dupRejects];
    const report: ImportReport = { batchId: c.batchId, sourceSha256: c.sourceSha256, startOffset: c.startOffset,
      totalRecords: c.totalRecords, loaded: accepted.length, rejected, controlTotals, sourceTotals: c.sourceTotals };
    await db.query(`UPDATE mig.batch_runs SET loaded = $1, rejected_new = $2 WHERE batch_id = $3 AND start_offset = $4 AND source_sha256 = $5`,
      [accepted.length, rejected.length, c.batchId, c.startOffset, c.sourceSha256]);
    const b = buildBatchInsert(report, c.sourceFile, c.layoutName, { dataClass: c.dataClass, importedByUserId: c.importedByUserId });
    await db.query(b.text, b.values);
    for (const [kind, totals] of [["control", controlTotals], ["source", c.sourceTotals]] as const)
      for (const [field, amount] of Object.entries(totals))
        await db.query(
          `INSERT INTO mig.batch_totals (batch_id, field, kind, amount) VALUES ($1,$2,$3,$4)
           ON CONFLICT (batch_id, field, kind) DO UPDATE SET amount = mig.batch_totals.amount + EXCLUDED.amount`,
          [c.batchId, field, kind, amount]);
    for (const r of buildRejectInserts(report)) await db.query(r.text, r.values);
    for (const rec of accepted) { const q = buildStagingInsert(c.schemaTable, c.batchId, rec); await db.query(q.text, q.values); }
    await db.query(
      `INSERT INTO mig.job_state (batch_id, next_offset, loaded_keys, key_count, updated_at)
       VALUES ($1,$2,'[]'::jsonb,$3, now())
       ON CONFLICT (batch_id) DO UPDATE SET next_offset = GREATEST(mig.job_state.next_offset, EXCLUDED.next_offset),
         key_count = mig.job_state.key_count + $3, updated_at = now()`,
      [c.batchId, c.nextOffset, keyFields.length ? accepted.length : 0]);
    await db.query("COMMIT");
    return { alreadyRecorded: false, accepted: accepted.length, duplicates: dupRejects.length };
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
