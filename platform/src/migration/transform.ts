import { readFileSync } from "node:fs";
import type { SqlExecutor } from "./load.js";

// Staging -> operational transformation. A transform may run ONLY when every field it
// maps is marked Approved in the mapping register (migration/reconciled/mapping_register_v2.csv).
// This is the enforcement point for Directive §9/§14: no unapproved mapping reaches
// operational tables. The register is the approval record; code does not self-approve.

export interface TransformField { from: string; to: string; cast?: string }
export interface TransformSpec {
  name: string; legacyMember: string; fromTable: string; toTable: string;
  conflictColumn: string; fields: TransformField[];
}

export const BUILDINGS_TRANSFORM: TransformSpec = {
  name: "pblbuldg-to-buildings",
  legacyMember: "PBLBULDG",
  fromTable: "school_map.pblbuldg",
  toTable: "app.buildings",
  conflictColumn: "legacy_blcd",
  fields: [
    { from: "blcd", to: "legacy_blcd", cast: "text" },
    { from: "shnm", to: "name_ar" },        // source school name is Arabic; name_en is NOT fabricated
    { from: "vgcd", to: "village_code" },
  ],
};

export function checkRegisterApprovals(registerCsv: string, spec: TransformSpec): void {
  const lines = registerCsv.trim().split("\n").slice(1);
  const wanted = new Set(spec.fields.map(f => f.from.toUpperCase()));
  const seen = new Map<string, string>();
  for (const line of lines) {
    const cells = line.split(",");
    if (cells[0] === spec.legacyMember && wanted.has(cells[3])) seen.set(cells[3], cells[8]);
  }
  const pending = spec.fields.filter(f => {
    const st = seen.get(f.from.toUpperCase());
    return !st || !st.startsWith("Approved");
  });
  if (pending.length) throw new Error(
    `transform ${spec.name} refused: ${pending.length} mapped field(s) are not Approved in the mapping register ` +
    `(${pending.map(f => f.from).join(", ")}) — operational loading requires approved mappings`);
}

export function buildTransformInsert(spec: TransformSpec): { text: string } {
  const targetCols = spec.fields.map(f => f.to).join(", ");
  const sourceCols = spec.fields.map(f => f.cast ? `${f.from}::${f.cast}` : f.from).join(", ");
  return { text:
    `INSERT INTO ${spec.toTable} (${targetCols}) SELECT ${sourceCols} FROM ${spec.fromTable} ` +
    `WHERE _batch_id = $1 ON CONFLICT (${spec.conflictColumn}) DO NOTHING` };
}

export async function runTransform(db: SqlExecutor, spec: TransformSpec, batchId: string, registerCsvPath: string): Promise<void> {
  checkRegisterApprovals(readFileSync(registerCsvPath, "utf8"), spec);
  const q = buildTransformInsert(spec);
  await db.query(q.text, [batchId]);
}
