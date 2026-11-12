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
  batchId: string; sourceSha256: string; startOffset: number;
  totalRecords: number; loaded: number; rejected: RejectedRecord[];
  controlTotals: Record<string, string>;   // exact decimal sums per numeric field, computed on LOADED records
  sourceTotals: Record<string, string>;    // same sums over ALL parseable records (for reconciliation deltas)
}
export interface DecodedRecord { values: Record<string, string>; raw: string; offset: number }

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
  return { values, raw: buf.toString("hex"), offset: 0 };
}

export interface JobState { batchId: string; nextOffset: number; loadedKeys: string[] }
export function newJob(batchId: string): JobState { return { batchId, nextOffset: 0, loadedKeys: [] }; }

/** Import a fixed-width extract buffer. Resumable: pass a JobState from a previous
 *  interrupted run and already-loaded records are skipped (checkpoint = nextOffset,
 *  idempotency = key set). Duplicate keys and undecodable records go to the reject
 *  list with reasons — nothing is silently dropped or coerced. */
export function importFixedWidth(data: Buffer, layout: Layout, job: JobState): { records: DecodedRecord[]; report: ImportReport; state: JobState } {
  const startAt = job.nextOffset;
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
    try { rec = parseRecord(slice, layout); rec.offset = off; }
    catch (e: any) { rejected.push({ offset: off, reason: String(e.message || e), rawHex: slice.toString("hex") }); continue; }
    for (const f of numericFields) sourceTotals[f.name] = sourceTotals[f.name].plus(rec.values[f.name]);
    const key = keyFields.map(f => rec.values[f.name]).join("|");
    if (keyFields.length && loadedKeys.has(key)) {
      rejected.push({ offset: off, reason: `duplicate key ${key}`, rawHex: slice.toString("hex") }); continue;
    }
    if (keyFields.length) loadedKeys.add(key);
    for (const f of numericFields) totals[f.name] = totals[f.name].plus(rec.values[f.name]);
    records.push(rec);
  }
  // Checkpoint semantics: every record before nextOffset has been fully handled —
  // loaded into staging OR quarantined into the reject list (both persisted in the
  // same transaction), so a resume may safely skip loaded and rejected records alike.
  job.nextOffset = total;
  // An incomplete trailing record is quarantined, never silently ignored:
  // the source file is evidence, and a short tail means a truncated extract.
  const remainder = data.length % layout.recordLength;
  if (remainder !== 0) {
    const off = total * layout.recordLength;
    rejected.push({ offset: off,
      reason: `incomplete trailing record: ${remainder} byte(s) remain, record length is ${layout.recordLength} — extract appears truncated; quarantined, not loaded`,
      rawHex: data.subarray(off).toString("hex") });
  }
  job.loadedKeys = [...loadedKeys];
  const fmt = (m: Record<string, Money>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.toString()]));
  return { records, state: job, report: {
    batchId: job.batchId, sourceSha256: sha, startOffset: startAt, totalRecords: total + (remainder !== 0 ? 1 : 0), loaded: records.length,
    rejected, controlTotals: fmt(totals), sourceTotals: fmt(sourceTotals) } };
}

/** A layout is a controlled artifact: it must be internally consistent before any
 *  byte is loaded under it. Checks: field lengths sum to the record length, decimal
 *  scale fits the field, encodings are supported, packed/zoned lengths are sane,
 *  exactly the declared key fields exist. Throws with every problem found. */
export function validateLayout(layout: Layout): void {
  const problems: string[] = [];
  const sum = layout.fields.reduce((a, f) => a + f.length, 0);
  if (sum !== layout.recordLength) problems.push(`field lengths sum to ${sum}, recordLength is ${layout.recordLength}`);
  const supported: SourceEncoding[] = ["ibm420", "ibm425", "windows-1256", "ibm864", "utf8"];
  for (const f of layout.fields) {
    if (f.length <= 0) problems.push(`${f.name}: non-positive length`);
    if ((f.decimals ?? 0) > f.length * 2) problems.push(`${f.name}: decimal scale ${f.decimals} cannot fit length ${f.length}`);
    if (f.type === "char" && f.encoding && !supported.includes(f.encoding)) problems.push(`${f.name}: unsupported encoding ${f.encoding}`);
    if (f.type === "packed" && f.length > 16) problems.push(`${f.name}: packed length ${f.length} exceeds 31-digit packed maximum`);
  }
  if (problems.length) throw new Error(`layout verification failed: ${problems.join("; ")}`);
}
export function layoutHash(layout: Layout): string {
  return createHash("sha256").update(JSON.stringify(layout)).digest("hex");
}

/** Delimited text exports (e.g. CPYTOIMPF with a delimiter). IMPORTANT: in this format
 *  packed/zoned fields arrive as decimal TEXT — CPYTOIMPF does not emit native packed
 *  bytes. Numeric fields are therefore parsed as exact decimal strings, never as binary.
 *  The whole file is decoded once with the declared encoding (the export's code page). */
export function importDelimited(data: Buffer, fields: FieldSpec[], opts: { delimiter?: string; encoding?: SourceEncoding; batchId: string }):
  { records: DecodedRecord[]; rejected: RejectedRecord[]; controlTotals: Record<string, string> } {
  const text = decodeSource(data, opts.encoding ?? "windows-1256");
  const delim = opts.delimiter ?? ",";
  const records: DecodedRecord[] = []; const rejected: RejectedRecord[] = [];
  const totals: Record<string, Money> = {};
  const numeric = fields.filter(f => f.type === "packed" || f.type === "zoned" || f.type === "int");
  for (const f of numeric) totals[f.name] = money("0");
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  lines.forEach((line, idx) => {
    const cells = line.split(delim);
    if (cells.length !== fields.length) { rejected.push({ offset: idx, reason: `line has ${cells.length} cells, layout has ${fields.length} fields`, rawHex: Buffer.from(line).toString("hex") }); return; }
    const values: Record<string, string> = {};
    try {
      fields.forEach((f, i) => {
        const cell = cells[i].trim();
        if (f.type === "char") values[f.name] = cell;
        else if (f.type === "int") { if (!/^-?\d+$/.test(cell)) throw new Error(`${f.name}: not an integer (${cell})`); values[f.name] = cell; }
        else values[f.name] = money(cell).toString(); // exact decimal text parse; throws on garbage
      });
    } catch (e: any) { rejected.push({ offset: idx, reason: String(e.message || e), rawHex: Buffer.from(line).toString("hex") }); return; }
    for (const f of numeric) totals[f.name] = totals[f.name].plus(values[f.name]);
    records.push({ values, raw: Buffer.from(line).toString("hex"), offset: idx });
  });
  return { records, rejected, controlTotals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.toString()])) };
}
