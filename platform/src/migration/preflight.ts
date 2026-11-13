// Preflight validation for incoming extracts (Phase 7, Workstream E).
// Streams the file once with bounded memory and produces the report an
// operator reviews BEFORE any import is authorized: checksum, size/record
// geometry, trailing bytes, encoding probe (Arabic presence, unmapped-byte
// and NUL detection on a sample), key duplication scan, and (for delimited
// files) structural sanity. Preflight never writes to the database.
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import type { Layout } from "./engine.js";
import { parseRecord } from "./engine.js";
import { decodeSource } from "../arabic.js";

export interface PreflightReport {
  fileBytes: number;
  sha256: string;
  sha256MatchesManifest: boolean | null;
  recordLength: number | null;
  wholeRecords: number | null;
  trailingBytes: number | null;
  recordCountMatchesManifest: boolean | null;
  sampleRecordsChecked: number;
  sampleParseFailures: number;
  arabicCharsInSample: number;
  nulBytesInSample: number;
  duplicateKeysInSample: number;
  keyField: string | null;
  findings: string[];
  verdict: "READY" | "REVIEW" | "REJECT";
}

const ARABIC = /[\u0600-\u06FF]/;

export async function preflightFile(path: string, layout: Layout | null, opts: {
  manifestSha256?: string; manifestRecordCount?: number; sampleRecords?: number;
} = {}): Promise<PreflightReport> {
  const sampleMax = opts.sampleRecords ?? 200;
  const sha = createHash("sha256");
  let bytes = 0; const chunks: Buffer[] = []; let kept = 0;
  const sampleBytesNeeded = layout ? layout.recordLength * sampleMax : 65536;
  for await (const c of createReadStream(path)) {
    sha.update(c); bytes += c.length;
    if (kept < sampleBytesNeeded) { chunks.push(c); kept += c.length; }
  }
  const sample = Buffer.concat(chunks);
  const findings: string[] = [];
  const rep: PreflightReport = {
    fileBytes: bytes, sha256: sha.digest("hex"),
    sha256MatchesManifest: opts.manifestSha256 ? undefined as never : null,
    recordLength: layout?.recordLength ?? null, wholeRecords: null, trailingBytes: null,
    recordCountMatchesManifest: null, sampleRecordsChecked: 0, sampleParseFailures: 0,
    arabicCharsInSample: 0, nulBytesInSample: 0, duplicateKeysInSample: 0,
    keyField: layout?.fields.find(f => f.key)?.name ?? null, findings, verdict: "READY",
  };
  rep.sha256MatchesManifest = opts.manifestSha256 ? (rep.sha256 === opts.manifestSha256) : null;
  if (rep.sha256MatchesManifest === false) findings.push("CHECKSUM MISMATCH against the manifest — do not import; re-transfer or re-issue the extract");

  if (layout) {
    rep.wholeRecords = Math.floor(bytes / layout.recordLength);
    rep.trailingBytes = bytes % layout.recordLength;
    if (rep.trailingBytes > 0) findings.push(`${rep.trailingBytes} trailing bytes after the last whole record — the importer will quarantine them; confirm the transfer was not truncated`);
    if (opts.manifestRecordCount !== undefined) {
      rep.recordCountMatchesManifest = opts.manifestRecordCount === rep.wholeRecords;
      if (!rep.recordCountMatchesManifest) findings.push(`record count mismatch: file holds ${rep.wholeRecords} whole records, manifest states ${opts.manifestRecordCount}`);
    }
    const keys = new Set<string>();
    const n = Math.min(sampleMax, rep.wholeRecords);
    for (let i = 0; i < n; i++) {
      const raw = sample.subarray(i * layout.recordLength, (i + 1) * layout.recordLength);
      rep.sampleRecordsChecked++;
      if (raw.includes(0)) rep.nulBytesInSample++;
      try {
        const rec = parseRecord(raw, layout);
        for (const f of layout.fields) {
          const v = rec.values[f.name];
          if (typeof v === "string" && ARABIC.test(v)) rep.arabicCharsInSample += [...v].filter(ch => ARABIC.test(ch)).length;
        }
        const kf = layout.fields.filter(f => f.key);
        if (kf.length) { const k = kf.map(f => rec.values[f.name]).join("|"); if (keys.has(k)) rep.duplicateKeysInSample++; else keys.add(k); }
      } catch { rep.sampleParseFailures++; }
    }
    if (rep.sampleParseFailures > 0) findings.push(`${rep.sampleParseFailures}/${rep.sampleRecordsChecked} sampled records failed to parse — layout or CCSID mismatch is likely; do not import until resolved`);
    if (rep.nulBytesInSample > 0) findings.push(`${rep.nulBytesInSample} sampled records contain NUL bytes — possible binary/text format mismatch`);
    if (rep.duplicateKeysInSample > 0) findings.push(`${rep.duplicateKeysInSample} duplicate keys inside the sample — duplicates will be quarantined at import (evidence preserved)`);
    if (rep.arabicCharsInSample === 0) findings.push("no Arabic characters decoded in the sample — if this file should contain Arabic, verify the CCSID before importing");
  } else {
    rep.nulBytesInSample = sample.includes(0) ? 1 : 0;
    try { decodeSource(sample, "utf8"); } catch { findings.push("sample is not valid UTF-8 — a layout/CCSID is required before preflight can say more"); }
    findings.push("no layout supplied — structural checks skipped; register and verify the layout first");
  }

  rep.verdict = rep.sha256MatchesManifest === false || rep.sampleParseFailures > 0 && rep.sampleRecordsChecked > 0 && rep.sampleParseFailures === rep.sampleRecordsChecked
    ? "REJECT" : findings.length ? "REVIEW" : "READY";
  return rep;
}
