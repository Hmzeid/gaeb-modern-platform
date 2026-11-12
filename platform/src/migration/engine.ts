import { createHash } from "node:crypto";
import { decodePacked, decodeZoned, money, type Money } from "../money.js";
import { decodeSource, type SourceEncoding } from "../arabic.js";

// Offline extract importer — the V6R1-safe migration path (Directive §6):
// the customer produces fixed-width or delimited extracts on the IBM i side
// (CPYTOIMPF / batch CL), transfers them by any channel, and this engine loads
// them here. It NEVER writes to the source system. Raw records are preserved
// verbatim (sha256 + raw text) alongside their decoded values for lineage.

export type FieldType = "char" | "packed" | "zoned" | "int";
export interface FieldSpec {
  name: string; type: FieldType; length: number; decimals?: number;
  encoding?: SourceEncoding;          // char fields: source encoding per field (B-05)
  key?: boolean;
}
export interface Layout { recordLength: number; fields: FieldSpec[] }
export interface RejectedRecord { offset: number; reason: string; rawHex: string }
export interface ImportReport {
  batchId: string; sourceSha256: string;
  totalRecords: number; loaded: number; rejected: RejectedRecord[];
  controlTotals: Record<string, string>;   // exact decimal sums per numeric field, computed on LOADED records
  sourceTotals: Record<string, string>;    // same sums over ALL parseable records (for reconciliation deltas)
}
export interface DecodedRecord { values: Record<string, string>; raw: string }

export function parseRecord(buf: Buffer, layout: Layout): DecodedRecord {
  const values: Record<string, string> = {};
  let pos = 0;
  for (const f of layout.fields) {
    const slice = buf.subarray(pos, pos + f.length); pos += f.length;
    if (slice.length < f.length) throw new Error(`short record at field ${f.name}`);
    switch (f.type) {
      case "char": {
        const enc = f.encoding ?? "windows-1256";
        values[f.name] = decodeSource(slice, enc).replace(/\s+$/u, "");
        break;
      }
      case "packed": values[f.name] = decodePacked(slice, f.decimals ?? 0).toString(); break;
      case "zoned": values[f.name] = decodeZoned(slice, f.decimals ?? 0, "ebcdic").toString(); break;
      case "int": {
        const s = decodeSource(slice, "utf8").trim();
        if (!/^-?\d+$/.test(s)) throw new Error(`field ${f.name}: not an integer (${JSON.stringify(s)})`);
        values[f.name] = s; break;
      }
    }
  }
  return { values, raw: buf.toString("hex") };
}

export interface JobState { batchId: string; nextOffset: number; loadedKeys: string[] }
export function newJob(batchId: string): JobState { return { batchId, nextOffset: 0, loadedKeys: [] }; }

/** Import a fixed-width extract buffer. Resumable: pass a JobState from a previous
 *  interrupted run and already-loaded records are skipped (checkpoint = nextOffset,
 *  idempotency = key set). Duplicate keys and undecodable records go to the reject
 *  list with reasons — nothing is silently dropped or coerced. */
export function importFixedWidth(data: Buffer, layout: Layout, job: JobState): { records: DecodedRecord[]; report: ImportReport; state: JobState } {
  const sha = createHash("sha256").update(data).digest("hex");
  const records: DecodedRecord[] = [];
  const rejected: RejectedRecord[] = [];
  const loadedKeys = new Set(job.loadedKeys);
  const totals: Record<string, Money> = {}, sourceTotals: Record<string, Money> = {};
  const numericFields = layout.fields.filter(f => f.type === "packed" || f.type === "zoned");
  for (const f of numericFields) { totals[f.name] = money("0"); sourceTotals[f.name] = money("0"); }
  const keyFields = layout.fields.filter(f => f.key);
  const total = Math.floor(data.length / layout.recordLength);
  for (let i = job.nextOffset; i < total; i++) {
    const off = i * layout.recordLength;
    const slice = data.subarray(off, off + layout.recordLength);
    let rec: DecodedRecord;
    try { rec = parseRecord(slice, layout); }
    catch (e: any) { rejected.push({ offset: off, reason: String(e.message || e), rawHex: slice.toString("hex") }); continue; }
    for (const f of numericFields) sourceTotals[f.name] = sourceTotals[f.name].plus(rec.values[f.name]);
    const key = keyFields.map(f => rec.values[f.name]).join("|");
    if (keyFields.length && loadedKeys.has(key)) {
      rejected.push({ offset: off, reason: `duplicate key ${key}`, rawHex: slice.toString("hex") }); continue;
    }
    if (keyFields.length) loadedKeys.add(key);
    for (const f of numericFields) totals[f.name] = totals[f.name].plus(rec.values[f.name]);
    records.push(rec);
    job.nextOffset = i + 1;
  }
  job.loadedKeys = [...loadedKeys];
  const fmt = (m: Record<string, Money>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.toString()]));
  return { records, state: job, report: {
    batchId: job.batchId, sourceSha256: sha, totalRecords: total, loaded: records.length,
    rejected, controlTotals: fmt(totals), sourceTotals: fmt(sourceTotals) } };
}
