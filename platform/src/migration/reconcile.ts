import type { Pool } from "pg";
import { money } from "../money.js";

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

/** Full reconciliation REPORT (Phase 5 Workstream D): the computed reconciliation
 *  plus provenance — source checksum, execution history, transform definition
 *  hash and approval reference — rendered as machine-readable JSON or a
 *  human-readable text report. The three outcomes are always stated separately:
 *  technical reconciliation (computed here), business equivalence (pending
 *  customer evidence), customer acceptance (pending customer decision). A
 *  technical pass is never labelled business approval. */
export interface ReconciliationReport extends Reconciliation {
  sourceSha256: string;
  layoutName: string;
  importedBy: string | null;
  transform: { name: string; definitionHash: string; approvals: { field: string; approvedBy: string; mode: string; status: string; evidenceRef: string }[] } | null;
  technicalOutcome: "PASSED" | "FAILED";
  businessEquivalence: "PENDING — customer evidence not yet supplied";
  customerAcceptance: "PENDING — customer decision not yet recorded";
  generatedAt: string;
}

export async function computeReconciliationReport(pool: Pool, batchId: string): Promise<ReconciliationReport | null> {
  const rec = await computeReconciliation(pool, batchId);
  if (!rec) return null;
  const meta = await pool.query(
    `SELECT source_sha256, layout_name, u.username AS imported_by FROM mig.batches b
       LEFT JOIN app.users u ON u.id = b.imported_by_user_id WHERE b.batch_id = $1`, [batchId]);
  // The transform whose legacy member matches this batch's member, if any.
  const { TRANSFORMS, transformHash } = await import("./transform.js");
  const spec = Object.values(TRANSFORMS).find((t: any) => t.legacyMember.toLowerCase() === rec.member.toLowerCase());
  let transform: ReconciliationReport["transform"] = null;
  if (spec) {
    const appr = await pool.query(
      `SELECT legacy_field, approved_by, mode, status, evidence_ref FROM mig.mapping_approvals
        WHERE transform_name = $1 ORDER BY legacy_field`, [(spec as any).name]);
    transform = { name: (spec as any).name, definitionHash: transformHash(spec as any),
      approvals: appr.rows.map((r: any) => ({ field: r.legacy_field, approvedBy: r.approved_by, mode: r.mode, status: r.status, evidenceRef: r.evidence_ref })) };
  }
  return { ...rec, sourceSha256: meta.rows[0].source_sha256, layoutName: meta.rows[0].layout_name,
    importedBy: meta.rows[0].imported_by, transform,
    technicalOutcome: rec.countEquationHolds ? "PASSED" : "FAILED",
    businessEquivalence: "PENDING — customer evidence not yet supplied",
    customerAcceptance: "PENDING — customer decision not yet recorded",
    generatedAt: new Date().toISOString() };
}

export function renderReconciliationReport(r: ReconciliationReport): string {
  const lines = [
    `GAEB MIGRATION — RECONCILIATION REPORT`, ``,
    `Batch: ${r.batchId}  Member: ${r.member}  Class: ${r.dataClass}`,
    `Layout: ${r.layoutName}  Source SHA-256: ${r.sourceSha256}`,
    `Imported by: ${r.importedBy ?? "(offline CLI)"}  Import runs: ${r.runs}  Generated: ${r.generatedAt}`, ``,
    `EQUATIONS`,
    `  source records      = ${r.sourceRecords}`,
    `  loaded + quarantine = ${r.loadedRecords} + ${r.quarantinedRecords} = ${r.loadedRecords + r.quarantinedRecords}`,
    `  count equation holds: ${r.countEquationHolds}`,
    `  duplicate occurrences preserved as evidence: ${r.duplicateOccurrences}`, ``,
    `TOTALS (exact decimal)`,
    ...Object.keys(r.sourceTotals).map(f => `  ${f}: source ${r.sourceTotals[f]}  loaded ${r.controlTotals[f] ?? "0"}  delta ${money(r.sourceTotals[f]).minus(money(r.controlTotals[f] ?? "0")).toString()}`), ``,
    `QUARANTINE`,
    ...(r.quarantineReasons.length ? r.quarantineReasons.map(q => `  ${q.count} x ${q.reason}`) : [`  (none)`]), ``,
  ];
  if (r.transform) lines.push(`TRANSFORM`, `  ${r.transform.name}  definition hash ${r.transform.definitionHash}`,
    ...r.transform.approvals.map(a => `  ${a.field}: approved by ${a.approvedBy} (${a.mode}, ${a.status}) evidence: ${a.evidenceRef || "—"}`), ``);
  lines.push(`OUTCOMES (always stated separately)`,
    `  Technical reconciliation: ${r.technicalOutcome}`,
    `  Business equivalence: ${r.businessEquivalence}`,
    `  Customer acceptance: ${r.customerAcceptance}`);
  return lines.join("\n");
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
