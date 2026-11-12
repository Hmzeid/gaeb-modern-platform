import { createHash } from "node:crypto";
import { decodePacked, decodeZoned, money, type Money } from "../money.js";
import { decodeSource, type SourceEncoding } from "../arabic.js";

// Offline extract importer — the V6R1-safe migration path (Directive §6):
// the customer produces fixed-width or delimited extracts on the IBM i side
// (CPYTOIMPF / batch CL), transfers them by any channel, and this engine loads
// them here. It NEVER writes to the source system. Raw records are preserved
// verbatim (sha256 + raw text) alongside their decoded values for lineage.

export type FieldType = "char" | "packed" | "zoned" | "int" | "date";
export type ExtractFormat = "native-binary" | "fixed-text" | "delimited";
export interface FieldSpec {
  name: string; type: FieldType; length: number; decimals?: number;
  encoding?: SourceEncoding;          // char fields: source encoding per field (B-05)
  key?: boolean;
}
export interface Layout {
  recordLength: number; fields: FieldSpec[];
  /** Delivery format of the extract. Decides how numeric fields are interpreted:
   *  native-binary = packed/zoned are raw bytes; fixed-text = CPYTOIMPF fixed format
   *  (numerics are character text); delimited = CPYTOIMPF delimited (numerics are
   *  decimal text). The format is part of the registered, hash-verified layout —
   *  an extract must never be decoded under a format it was not produced in. */
  format?: ExtractFormat;
  delimiter?: string;          // delimited format: field delimiter (default ",")
  decimalSeparator?: "." | ","; // delimited/fixed-text numeric text
}
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
        if (values[f.name].includes("\u0000")) throw new Error(`field ${f.name}: NUL byte in character data — padding or CCSID mismatch (EBCDIC fields pad with 0x40, not 0x00)`);
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


/** Decode a numeric field that arrived as CHARACTER TEXT (CPYTOIMPF fixed/delimited).
 *  In an EBCDIC stream code page (e.g. IBM420) digits are bytes F0–F9, space is 40,
 *  minus is 60, point is 4B. In an ASCII/UTF-8 stream file the same characters are
 *  their ASCII selves. Both are normalized here, then parsed as exact decimal text.
 *  Native overpunch characters ({, }, letters) are REJECTED — they belong to native
 *  zoned bytes and their presence means the format assumption is wrong. */
export function decodeTextNumber(slice: Buffer, decimals: number, decimalSeparator: "." | "," = "."): string {
  let s = "";
  for (const b of slice) {
    if (b >= 0xF0 && b <= 0xF9) s += String(b - 0xF0);            // EBCDIC digit
    else if (b === 0x40) s += " ";                                 // EBCDIC space
    else if (b === 0x60) s += "-";                                 // EBCDIC minus
    else if (b === 0x4B) s += ".";                                 // EBCDIC point
    else s += String.fromCharCode(b);                              // ASCII/UTF-8 as-is
  }
  s = s.trim();
  if (s.endsWith("-")) s = "-" + s.slice(0, -1).trim();            // trailing-sign form
  if (s.startsWith("+")) s = s.slice(1);
  if (decimalSeparator === ",") s = s.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) throw new Error(`text numeric: not a decimal number (${JSON.stringify(s)})`);
  return money(s).toString();
}

export function parseTextRecord(buf: Buffer, layout: Layout): DecodedRecord {
  const values: Record<string, string> = {};
  let pos = 0;
  for (const f of layout.fields) {
    const slice = buf.subarray(pos, pos + f.length); pos += f.length;
    if (slice.length < f.length) throw new Error(`short record at field ${f.name}`);
    if (f.type === "char") values[f.name] = decodeSource(slice, f.encoding ?? "windows-1256").replace(/\s+$/u, "");
    else if (f.type === "packed" || f.type === "zoned") values[f.name] = decodeTextNumber(slice, f.decimals ?? 0, layout.decimalSeparator ?? ".");
    else if (f.type === "int") { const s = decodeTextNumber(slice, 0); if (!/^-?\d+$/.test(s)) throw new Error(`field ${f.name}: not an integer (${s})`); values[f.name] = s; }
    else if (f.type === "date") { const s = decodeSource(slice, "utf8").trim().replace(/[^0-9]/g, ""); values[f.name] = validateDateText(s, f.name); }
  }
  return { values, raw: buf.toString("hex"), offset: 0 };
}

export function validateDateText(s: string, field: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (!m) throw new Error(`field ${field}: not a YYYYMMDD date (${JSON.stringify(s)})`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3])
    throw new Error(`field ${field}: invalid calendar date (${s})`);
  return `${m[1]}-${m[2]}-${m[3]}`;
}

export interface JobState { batchId: string; nextOffset: number; loadedKeys: string[] }
export function newJob(batchId: string): JobState { return { batchId, nextOffset: 0, loadedKeys: [] }; }

/** Import a fixed-width extract buffer. Resumable: pass a JobState from a previous
 *  interrupted run and already-loaded records are skipped (checkpoint = nextOffset,
 *  idempotency = key set). Duplicate keys and undecodable records go to the reject
 *  list with reasons — nothing is silently dropped or coerced. */
function importFixed(data: Buffer, layout: Layout, job: JobState, parser: (b: Buffer, l: Layout) => DecodedRecord): { records: DecodedRecord[]; report: ImportReport; state: JobState } {
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
    try { rec = parser(slice, layout); rec.offset = off; }
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

export function importFixedWidth(data: Buffer, layout: Layout, job: JobState) {
  if ((layout.format ?? "native-binary") !== "native-binary")
    throw new Error(`layout format is ${layout.format} — refusing to decode it as native binary; use the matching importer`);
  return importFixed(data, layout, job, parseRecord);
}
/** CPYTOIMPF FIXED-format text: same record geometry, but numeric fields are character
 *  representations — they are NEVER passed to the packed/zoned binary decoders. */
export function importFixedText(data: Buffer, layout: Layout, job: JobState) {
  if ((layout.format ?? "native-binary") !== "fixed-text")
    throw new Error(`layout format is ${layout.format ?? "native-binary"} — refusing to decode it as fixed text; use the matching importer`);
  return importFixed(data, layout, job, parseTextRecord);
}
/** Format dispatch: the registered layout decides the decoder, never the operator's guess. */
export function importExtract(data: Buffer, layout: Layout, job: JobState) {
  const fmt = layout.format ?? "native-binary";
  if (fmt === "native-binary") return importFixedWidth(data, layout, job);
  if (fmt === "fixed-text") return importFixedText(data, layout, job);
  throw new Error("delimited extracts use importDelimited (record geometry differs)");
}

/** A layout is a controlled artifact: it must be internally consistent before any
 *  byte is loaded under it. Checks: field lengths sum to the record length, decimal
 *  scale fits the field, encodings are supported, packed/zoned lengths are sane,
 *  exactly the declared key fields exist. Throws with every problem found. */
export function validateLayout(layout: Layout): void {
  const problems: string[] = [];
  const fmt = layout.format ?? "native-binary";
  if (!["native-binary", "fixed-text", "delimited"].includes(fmt)) problems.push(`unknown format ${fmt}`);
  if (fmt !== "delimited") {
    const sum = layout.fields.reduce((a, f) => a + f.length, 0);
    if (sum !== layout.recordLength) problems.push(`field lengths sum to ${sum}, recordLength is ${layout.recordLength}`);
  }
  if (fmt === "delimited" && layout.delimiter && layout.decimalSeparator === "," && layout.delimiter === ",")
    problems.push("delimiter ',' conflicts with decimal separator ',' — choose a different delimiter");
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

/** Delimited text exports (CPYTOIMPF with delimiters). In this format packed/zoned
 *  fields arrive as decimal TEXT — never native bytes. Full CSV semantics: quoted
 *  fields, doubled-quote escapes, embedded delimiters and embedded line breaks inside
 *  quotes, configurable delimiter and decimal separator, trailing-sign and
 *  parenthesized negatives, explicit null markers, and YYYYMMDD dates validated as
 *  real calendar dates. The whole file is decoded once with the declared encoding
 *  (the export's stream code page, e.g. windows-1256 for Arabic). */
export function parseDelimitedText(text: string, delimiter: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); cell = ""; rows.push(row); row = []; }
    else if (c !== "\r") cell += c;
  }
  if (quoted) throw new Error("delimited parse: unterminated quoted field at end of file");
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0] === ""));
}
export function importDelimited(data: Buffer, fields: FieldSpec[], opts: { delimiter?: string; encoding?: SourceEncoding; decimalSeparator?: "." | ","; nullMarker?: string; batchId: string }):
  { records: DecodedRecord[]; rejected: RejectedRecord[]; controlTotals: Record<string, string> } {
  const text = decodeSource(data, opts.encoding ?? "windows-1256");
  const rows = parseDelimitedText(text, opts.delimiter ?? ",");
  const records: DecodedRecord[] = []; const rejected: RejectedRecord[] = [];
  const totals: Record<string, Money> = {};
  const numeric = fields.filter(f => f.type === "packed" || f.type === "zoned" || f.type === "int");
  for (const f of numeric) totals[f.name] = money("0");
  rows.forEach((cells, idx) => {
    const rawHex = Buffer.from(cells.join(opts.delimiter ?? ","), "utf8").toString("hex");
    if (cells.length !== fields.length) { rejected.push({ offset: idx, reason: `record has ${cells.length} cells, layout has ${fields.length} fields`, rawHex }); return; }
    const values: Record<string, string> = {};
    try {
      fields.forEach((f, i) => {
        let cell = cells[i];
        const isNull = opts.nullMarker !== undefined && cell === opts.nullMarker;
        if (f.type === "char") values[f.name] = isNull ? "" : cell;   // source text preserved, never trimmed into a different value
        else if (isNull) throw new Error(`${f.name}: null value in numeric field`);
        else if (f.type === "date") values[f.name] = validateDateText(cell.trim().replace(/[^0-9]/g, ""), f.name);
        else if (f.type === "int") { const s = cell.trim(); if (!/^-?\d+$/.test(s)) throw new Error(`${f.name}: not an integer (${JSON.stringify(cell)})`); values[f.name] = s; }
        else {
          let s = cell.trim();
          if (/^\(.*\)$/.test(s)) s = "-" + s.slice(1, -1);        // accounting negative
          // thousands group separators are presentation, not value: strip the one that
          // is not the decimal separator ("1,250.75" with '.' decimal; "1.250,75" with ',')
          s = (opts.decimalSeparator ?? ".") === "." ? s.replace(/,/g, "") : s.replace(/\./g, "");
          values[f.name] = decodeTextNumber(Buffer.from(s, "utf8"), f.decimals ?? 0, opts.decimalSeparator ?? ".");
        }
      });
    } catch (e: any) { rejected.push({ offset: idx, reason: String(e.message || e), rawHex }); return; }
    for (const f of numeric) totals[f.name] = totals[f.name].plus(values[f.name]);
    records.push({ values, raw: rawHex, offset: idx });
  });
  return { records, rejected, controlTotals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, v.toString()])) };
}