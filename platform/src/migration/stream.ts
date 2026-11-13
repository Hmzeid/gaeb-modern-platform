import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseRecord, parseTextRecord, type Layout, type DecodedRecord, type RejectedRecord } from "./engine.js";
import { persistChunk, loadStreamCheckpoint, type SqlExecutor } from "./load.js";
import { money, type Money } from "../money.js";

// Streaming importer for large extracts. The file is never fully loaded into
// memory: records are decoded from a rolling buffer and persisted in chunks,
// and the durable checkpoint advances inside the SAME transaction as each
// chunk — a crash between chunks loses nothing, and a restart resumes at the
// checkpoint.
//
// Phase 5 scalability fix: this path no longer keeps or checkpoints the full
// loaded-key set. Duplicate detection is split — within a chunk, a bounded
// in-memory set (<= chunk size); across chunks and across resumes, the
// mig.loaded_keys table inside persistChunk's transaction. The checkpoint is
// O(1) (offset + key count). Memory is therefore bounded by the chunk size,
// and total checkpoint bytes are O(records), not O(records^2 / chunk).
// Progress is reported in records actually processed, never estimated.

export interface StreamOptions {
  table: string; layoutName: string; chunkRecords?: number;
  dataClass?: string; importedByUserId?: number | null;
  onProgress?: (processed: number, total: number) => void;
  /** Test/ops hook invoked after each committed chunk; throwing aborts the import
   *  with all previously committed chunks intact (crash simulation / pause). */
  afterChunk?: (chunkIndex: number) => void | Promise<void>;
}
export interface StreamResult { batchId: string; sourceSha256: string; totalRecords: number; resumedFromRecord: number; chunksCommitted: number }

export async function sha256File(path: string): Promise<string> {
  const h = createHash("sha256");
  for await (const chunk of createReadStream(path)) h.update(chunk as Buffer);
  return h.digest("hex");
}

export async function streamImportFile(db: SqlExecutor & { query(t: string, v?: unknown[]): Promise<any> },
  path: string, layout: Layout, opts: StreamOptions): Promise<StreamResult> {
  const sha = await sha256File(path);
  const batchId = `mig-${sha.slice(0, 16)}`;
  const size = (await stat(path)).size;
  const totalFull = Math.floor(size / layout.recordLength);
  const remainder = size % layout.recordLength;
  const totalRecords = totalFull + (remainder ? 1 : 0);
  const checkpoint = await loadStreamCheckpoint(db, batchId);
  const resumedFrom = checkpoint.nextOffset;
  const parser = (layout.format ?? "native-binary") === "fixed-text" ? parseTextRecord : parseRecord;
  const numericFields = layout.fields.filter(f => f.type === "packed" || f.type === "zoned");
  const keyFields = layout.fields.filter(f => f.key);
  const chunkSize = opts.chunkRecords ?? 500;

  let chunk: DecodedRecord[] = []; let chunkRejects: RejectedRecord[] = [];
  let chunkKeys = new Set<string>();   // bounded: within-chunk duplicates only
  let chunkSource: Record<string, Money> = {};
  const resetChunk = () => { chunk = []; chunkRejects = []; chunkKeys = new Set(); chunkSource = {};
    for (const f of numericFields) chunkSource[f.name] = money("0"); };
  resetChunk();
  let chunkStart = checkpoint.nextOffset; let processed = checkpoint.nextOffset; let chunks = 0;

  const flush = async (final = false) => {
    if (!chunk.length && !chunkRejects.length && !final) return;
    await persistChunk(db, {
      batchId, sourceSha256: sha, sourceFile: path, layoutName: opts.layoutName,
      schemaTable: opts.table, layout, startOffset: chunkStart, nextOffset: processed,
      totalRecords, candidates: chunk, parseRejects: chunkRejects,
      sourceTotals: Object.fromEntries(Object.entries(chunkSource).map(([k, v]) => [k, v.toString()])),
      dataClass: opts.dataClass ?? "synthetic", importedByUserId: opts.importedByUserId ?? null });
    chunks++; await opts.afterChunk?.(chunks);
    opts.onProgress?.(processed, totalRecords);
    resetChunk(); chunkStart = processed;
  };

  let buffer: Buffer = Buffer.alloc(0);
  let recordIndex = checkpoint.nextOffset;
  const stream = createReadStream(path, { highWaterMark: 256 * 1024 });
  // Skip the already-processed prefix without decoding it (checkpoint resume).
  let bytesToSkip = checkpoint.nextOffset * layout.recordLength;
  for await (const data of stream) {
    let d = data as Buffer;
    if (bytesToSkip > 0) { const skip = Math.min(bytesToSkip, d.length); d = d.subarray(skip); bytesToSkip -= skip; if (!d.length) continue; }
    buffer = buffer.length ? Buffer.concat([buffer, d]) : Buffer.from(d);
    while (buffer.length >= layout.recordLength) {
      const slice = buffer.subarray(0, layout.recordLength);
      buffer = buffer.subarray(layout.recordLength);
      const off = recordIndex * layout.recordLength;
      let rec: DecodedRecord | null = null;
      try { rec = parser(slice, layout); rec.offset = off; }
      catch (e: any) { chunkRejects.push({ offset: off, reason: String(e.message || e), rawHex: slice.toString("hex") }); }
      if (rec) {
        for (const f of numericFields) chunkSource[f.name] = chunkSource[f.name].plus(rec.values[f.name]);
        const key = keyFields.map(f => rec!.values[f.name]).join("|");
        if (keyFields.length && chunkKeys.has(key)) chunkRejects.push({ offset: off, reason: `duplicate key ${key}`, rawHex: slice.toString("hex") });
        else { if (keyFields.length) chunkKeys.add(key); chunk.push(rec); }
      }
      recordIndex++; processed = recordIndex;
      if (chunk.length + chunkRejects.length >= chunkSize) await flush();
    }
  }
  if (remainder && recordIndex === totalFull) {
    chunkRejects.push({ offset: totalFull * layout.recordLength,
      reason: `incomplete trailing record: ${remainder} byte(s) remain, record length is ${layout.recordLength} — extract appears truncated; quarantined, not loaded`,
      rawHex: buffer.toString("hex") });
    processed = totalRecords;
  }
  await flush(true);
  return { batchId, sourceSha256: sha, totalRecords, resumedFromRecord: resumedFrom, chunksCommitted: chunks };
}
