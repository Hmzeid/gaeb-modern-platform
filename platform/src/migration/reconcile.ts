import type { Pool } from "pg";

/**
 * Executable reconciliation (Workstream D). Definitions — these are the meanings
 * used by every report and by the acceptance pack:
 *  - source_records: every record position seen in the source extract, including
 *    the incomplete trailing fragment if one was quarantined. From the run ledger
 *    (batches.total_records), i.e. counted once per source file, never per retry.
 *  - parsed_records: records that decoded successfully (loaded + duplicate-quarantined).
 *  - loaded_records: rows physically in staging for this batch.
 *  - quarantined_records: rows in mig.rejects for this batch (all causes).
 *  - duplicate_occurrences: quarantined rows whose cause is a repeated legacy key.
 *    They are source EVIDENCE, preserved in full (offset + raw bytes); nothing is
 *    deduplicated silently. Business-level dedup is a separate approved transform.
 *  - operational_rows: rows this batch contributed to operational tables
 *    (currently measurable for buildings via legacy lineage in audit/migration
 *    tables; reported per transform spec when a target key namespace matches).
 *  - source_value / loaded_value / difference: exact DECIMAL sums of the staging
 *    table's numeric columns vs the batch control totals recorded from the source.
 *    difference must equal the value carried by quarantined parseable records.
 * Invariant that must hold for acceptance: source_records = loaded_records +
 * quarantined_records, and (source_value - loaded_value) = quarantined_value.
 */
export interface Reconciliation {
  batchId: string;
  member: string;
  dataClass: string;
  sourceRecords: number;
  parsedRecords: number;
  loadedRecords: number;
  quarantinedRecords: number;
  duplicateOccurrences: number;
  countEquationHolds: boolean;
  controlTotals: Record<string, string>;
  sourceTotals: Record<string, string>;
  quarantineReasons: { reason: string; count: number }[];
  runs: number;
}

export async function computeReconciliation(pool: Pool, batchId: string): Promise<Reconciliation | null> {
  const b = await pool.query(
    `SELECT b.layout_name, b.data_class, b.total_records, b.loaded, b.rejected,
            l.layout_json->>'member' AS member
       FROM mig.batches b LEFT JOIN mig.layouts l ON l.name = b.layout_name
      WHERE b.batch_id=$1`, [batchId]);
  if (!b.rows.length) return null;
  const row = b.rows[0];
  const staged = await pool.query(
    `SELECT COUNT(*)::int AS n FROM mig.rejects WHERE batch_id=$1`, [batchId]);
  const reasons = await pool.query(
    `SELECT CASE WHEN reason LIKE 'duplicate key%' THEN 'duplicate key' ELSE reason END AS reason,
            COUNT(*)::int AS count FROM mig.rejects WHERE batch_id=$1 GROUP BY 1 ORDER BY 2 DESC`, [batchId]);
  const totals = await pool.query(
    `SELECT field, kind, amount::text AS amount FROM mig.batch_totals WHERE batch_id=$1 ORDER BY field, kind`, [batchId]);
  const runs = await pool.query(
    `SELECT COUNT(*)::int AS n FROM mig.batch_runs WHERE batch_id=$1`, [batchId]);
  const loaded = Number(row.loaded), quarantined = Number(staged.rows[0].n);
  const dup = reasons.rows.find((r: any) => r.reason === "duplicate key");
  const dupCount = dup ? dup.count : 0;
  const controlTotals: Record<string, string> = {}, sourceTotals: Record<string, string> = {};
  const trimNum = (s: string) => s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  for (const t of totals.rows) {
    if (t.kind === "control") controlTotals[t.field] = trimNum(t.amount); else sourceTotals[t.field] = trimNum(t.amount);
  }
  return {
    batchId, member: row.member ?? row.layout_name, dataClass: row.data_class,
    sourceRecords: Number(row.total_records),
    // Records that decoded successfully = loaded + duplicate-quarantined.
    // Parse failures and the truncated tail are source positions, not parsed records.
    parsedRecords: loaded + dupCount,
    loadedRecords: loaded,
    quarantinedRecords: quarantined,
    duplicateOccurrences: dupCount,
    countEquationHolds: Number(row.total_records) === loaded + quarantined,
    controlTotals, sourceTotals,
    quarantineReasons: reasons.rows.map((r: any) => ({ reason: r.reason, count: r.count })),
    runs: Number(runs.rows[0].n),
  };
}
