// Streaming-import benchmark — REAL measurements on this machine, synthetic data.
// Usage: DATABASE_URL=... node tools/benchmark.mjs [sizesMB=5,25]
import { writeFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import pg from "pg";
import { streamImportFile } from "../dist/src/migration/stream.js";
import TABLES from "../src/codepages/ibm_tables.json" with { type: "json" };

const inv = new Map(); for (const [b, cp] of Object.entries(TABLES["ibm420"])) inv.set(cp, Number(b));
const enc420 = (s) => Buffer.from([...s].map(ch => inv.get(ch.codePointAt(0)) ?? 0x40));
const layout = { recordLength: 58, fields: [
  { name: "BECD", type: "char", length: 2, encoding: "utf8" }, { name: "BLRD", type: "char", length: 2, encoding: "utf8" },
  { name: "BLCD", type: "char", length: 7, encoding: "utf8", key: true },
  { name: "SHNM", type: "char", length: 40, encoding: "ibm420" }, { name: "VGCD", type: "zoned", length: 7, decimals: 0 } ] };
const SALT = Date.now() % 100000;
function genFile(path, records) {
  const out = Buffer.alloc(records * 58);
  for (let i = 0; i < records; i++) {
    const rec = Buffer.alloc(58, 0x40), off = i * 58;
    rec.write("01", 0, "utf8"); rec.write("02", 2, "utf8"); rec.write(String(3000000 + SALT * 100000 + i).slice(-7).padStart(7, "3"), 4, "utf8");
    enc420("مدرسة النيل الابتدائية").copy(rec, 11);
    const digits = String(4000000 + i); const vg = Buffer.alloc(7, 0xF0);
    for (let d = 0; d < digits.length; d++) vg[vg.length - digits.length + d] = 0xF0 + Number(digits[d]);
    vg.copy(rec, 51); rec.copy(out, off);
  }
  writeFileSync(path, out);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const db = { query: (t, v) => client.query(t, v) };
const sizes = (process.argv[2] ?? "5,25").split(",").map(Number);
for (const mb of sizes) {
  const records = Math.floor(mb * 1024 * 1024 / 58);
  const path = `/tmp/bench-${mb}mb.dat`; genFile(path, records);
  global.gc?.();
  const rss0 = process.memoryUsage().rss;
  const t0 = Date.now();
  const r = await streamImportFile(db, path, layout, { table: "school_map.pblbuldg", layoutName: "bench", chunkRecords: 1000 });
  const ms = Date.now() - t0; const rss1 = process.memoryUsage().rss;
  const brow = await client.query("SELECT loaded FROM mig.batches WHERE batch_id = $1", [r.batchId]);
  console.log(JSON.stringify({ fileMB: mb, records, loaded: brow.rows[0].loaded, batch: r.batchId, chunks: r.chunksCommitted,
    seconds: +(ms / 1000).toFixed(2), recordsPerSec: Math.round(records / (ms / 1000)),
    rssBeforeMB: +(rss0 / 1048576).toFixed(1), rssAfterMB: +(rss1 / 1048576).toFixed(1) }));
  unlinkSync(path);
}
await client.end();
