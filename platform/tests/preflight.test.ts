import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { preflightFile } from "../src/migration/preflight.js";
import type { Layout } from "../src/migration/engine.js";

// Phase 7 Workstream E: the preflight validator must catch a bad transfer
// BEFORE an operator is allowed to import it.
const LAYOUT: Layout = { recordLength: 58, format: "native-binary", fields: [
  { name: "BECD", type: "char", length: 2, encoding: "utf8" }, { name: "BLRD", type: "char", length: 2, encoding: "utf8" },
  { name: "BLCD", type: "char", length: 7, encoding: "utf8", key: true },
  { name: "SHNM", type: "char", length: 40, encoding: "ibm420" }, { name: "VGCD", type: "zoned", length: 7, decimals: 0 } ] };

function fixture(): Buffer {
  const zoned = (s: string) => Buffer.from(s.split("").map(c => String.fromCharCode(0xF0 + Number(c))).join(""), "binary");
  const rec = (blcd: string, vg: string) => {
    const r = Buffer.alloc(58, 0x40);
    r.write("01", 0, "utf8"); r.write("02", 2, "utf8"); r.write(blcd, 4, "utf8");
    zoned(vg).copy(r, 51); return r;
  };
  return Buffer.concat([rec("3000001", "7654311"), rec("3000002", "7654312"), rec("3000001", "7654311")]);
}

test("preflight: manifest-verified file with a duplicate is REVIEW, never silent", async () => {
  const data = fixture();
  writeFileSync("/tmp/pf-test.dat", data);
  const sha = createHash("sha256").update(data).digest("hex");
  const rep = await preflightFile("/tmp/pf-test.dat", LAYOUT, { manifestSha256: sha, manifestRecordCount: 3 });
  assert.equal(rep.sha256MatchesManifest, true);
  assert.equal(rep.recordCountMatchesManifest, true);
  assert.equal(rep.duplicateKeysInSample, 1);
  assert.equal(rep.verdict, "REVIEW");
});

test("preflight: checksum mismatch is REJECT", async () => {
  writeFileSync("/tmp/pf-test.dat", fixture());
  const rep = await preflightFile("/tmp/pf-test.dat", LAYOUT, { manifestSha256: "0".repeat(64) });
  assert.equal(rep.verdict, "REJECT");
  assert.match(rep.findings.join(" "), /CHECKSUM MISMATCH/);
});

test("preflight: truncated transfer reports trailing bytes", async () => {
  writeFileSync("/tmp/pf-test.dat", Buffer.concat([fixture(), Buffer.alloc(9, 0x40)]));
  const rep = await preflightFile("/tmp/pf-test.dat", LAYOUT, {});
  assert.equal(rep.trailingBytes, 9);
  assert.equal(rep.wholeRecords, 3);
});
