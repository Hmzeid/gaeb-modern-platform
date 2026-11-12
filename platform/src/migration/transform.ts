import { createHash } from "node:crypto";
import type { SqlExecutor } from "./load.js";

// Staging -> operational transformation, gated by AUTHENTICATED mapping approvals
// (Phase 1.3, replacing the old CSV text-prefix check). An approval is a database
// record in mig.mapping_approvals naming: the legacy member+field, the target
// column, WHO approved it, when (DB timestamp), the supporting evidence reference,
// and a hash of the exact transformation definition. If the transform definition in
// code changes after approval, the hash no longer matches and the transform refuses
// to run — altered mappings cannot ride on old approvals.

export interface TransformField { legacy: string; target: string }
export interface TransformSpec {
  name: string; legacyMember: string; fields: TransformField[]; sql: string; note?: string;
}

export function transformHash(spec: TransformSpec): string {
  const canonical = JSON.stringify({
    name: spec.name, member: spec.legacyMember,
    fields: [...spec.fields].sort((a, b) => a.legacy.localeCompare(b.legacy)),
    sql: spec.sql,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export const BUILDINGS_TRANSFORM: TransformSpec = {
  name: "pblbuldg-to-buildings", legacyMember: "PBLBULDG",
  fields: [ { legacy: "BLCD", target: "legacy_blcd" }, { legacy: "SHNM", target: "name_ar" }, { legacy: "VGCD", target: "village_code" } ],
  // source school name is Arabic; name_en is deliberately not fabricated
  sql: `INSERT INTO app.buildings (legacy_blcd, name_ar, village_code)
        SELECT blcd::text, shnm, vgcd FROM school_map.pblbuldg WHERE _batch_id = $1
        ON CONFLICT (legacy_blcd) DO NOTHING`,
};
export const TENDERS_TRANSFORM: TransformSpec = {
  name: "pbytendr-to-tenders", legacyMember: "PBYTENDR",
  fields: [ { legacy: "TYPE", target: "legacy_type" }, { legacy: "TETNNO", target: "legacy_no" }, { legacy: "TNANM", target: "title" } ],
  sql: `INSERT INTO app.tenders (legacy_type, legacy_no, title)
        SELECT type, tetnno, tnanm FROM purchases.pbytendr WHERE _batch_id = $1
        ON CONFLICT (legacy_type, legacy_no) DO NOTHING`,
};
export const EXPROPRIATION_TRANSFORM: TransformSpec = {
  name: "remv01pf-to-expropriation-cases", legacyMember: "REMV01PF",
  fields: [ { legacy: "BLCD", target: "building_id" } ],
  // REMV01PF is by construction the PRE-decree file (cases move to REMV02 only after the
  // ministerial decree — source-evidenced). TOT is NOT mapped to compensation: its exact
  // business meaning is unconfirmed, so it stays unmapped pending customer evidence.
  sql: `INSERT INTO app.expropriation_cases (building_id, stage, migration_key)
        SELECT b.id, 'pre_decree', s._batch_id || ':' || s._source_offset
        FROM real_estate.remv01pf s JOIN app.buildings b ON b.legacy_blcd = s.blcd::text
        WHERE s._batch_id = $1 ON CONFLICT (migration_key) DO NOTHING`,
};
export const CERTIFICATES_TRANSFORM: TransformSpec = {
  name: "inv001pf-to-certificates", legacyMember: "INV001PF",
  fields: [ { legacy: "BLCD", target: "building_id" }, { legacy: "BILVLU", target: "gross" } ],
  note: "kind='construction': INV001PF is the construction-abstract member (maintenance abstracts live in a separate member family). B-02: INV001PF has conflicting delivered definitions; this spec follows the BIL02SRC variant. Header load only — deductions stay 0 and net = gross until GAEB confirms the authoritative definition and the deduction model (B-08). Awaiting customer verification.",
  sql: `INSERT INTO app.certificates (building_id, legacy_key, kind, gross, deductions, net, status)
        SELECT b.id, s.blcd::text || '|' || s.subtyp::text || '|' || s.ttncd::text || '|' || s.doccd::text,
               'construction', s.bilvlu, 0, s.bilvlu, 'certified'
        FROM abstracts.inv001pf s JOIN app.buildings b ON b.legacy_blcd = s.blcd::text
        WHERE s._batch_id = $1 ON CONFLICT (legacy_key) DO NOTHING`,
};
export const TRANSFORMS: Record<string, TransformSpec> = {
  buildings: BUILDINGS_TRANSFORM, tenders: TENDERS_TRANSFORM,
  expropriation: EXPROPRIATION_TRANSFORM, certificates: CERTIFICATES_TRANSFORM,
};

export async function assertApprovals(db: SqlExecutor, spec: TransformSpec): Promise<void> {
  const r = await (db as any).query(
    "SELECT legacy_field, approved_by, transform_hash FROM mig.mapping_approvals WHERE transform_name = $1", [spec.name]) as { rows: any[] };
  const byField = new Map(r.rows.map((x: any) => [String(x.legacy_field).toUpperCase(), x]));
  const hash = transformHash(spec);
  const problems: string[] = [];
  for (const f of spec.fields) {
    const row = byField.get(f.legacy.toUpperCase());
    if (!row) problems.push(`${f.legacy}: no approval record`);
    else if (!row.approved_by) problems.push(`${f.legacy}: approval has no approver`);
    else if (row.transform_hash !== hash) problems.push(`${f.legacy}: approval was given for a DIFFERENT transform definition (hash mismatch — re-approval required)`);
  }
  if (problems.length) throw new Error(`transform ${spec.name} refused: ${problems.join("; ")}`);
}

export async function runTransform(db: SqlExecutor, spec: TransformSpec, batchId: string): Promise<number> {
  await assertApprovals(db, spec);
  const r = await (db as any).query(spec.sql, [batchId]) as { rowCount?: number };
  return r.rowCount ?? 0;
}
