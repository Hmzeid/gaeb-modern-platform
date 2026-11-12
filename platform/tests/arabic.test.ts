import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeSource, detectMojibake, normalizeForSearch } from "../src/arabic.js";

const vec = JSON.parse(readFileSync(new URL("./codepage_vectors.json", import.meta.url), "utf8"));
const v1256 = JSON.parse(readFileSync(new URL("./testvectors.json", import.meta.url), "utf8"));

test("windows-1256 decodes to the exact original Arabic (independent Python-generated vector)", () => {
  assert.equal(decodeSource(Buffer.from(v1256.bytes["cp1256"]), "windows-1256"), v1256.phrase);
});
test("ibm420 (CCSID 420) EBCDIC bytes decode to the exact original Arabic (glibc charmap vector)", () => {
  assert.equal(decodeSource(Buffer.from(vec.ibm420), "ibm420"), vec.phrase);
});
test("ibm864 decodes shaped presentation forms back to standard letters", () => {
  for (const s of vec.ibm864_sample) {
    assert.equal(decodeSource(Buffer.from([s.byte]), "ibm864"), s.expected);
  }
});
test("ibm425 fails loudly instead of silently corrupting (no verified table)", () => {
  assert.throws(() => decodeSource(Buffer.from([0x81]), "ibm425"), /B-05/);
});
test("mojibake is flagged, never auto-repaired", () => {
  const garbled = Buffer.from(v1256.bytes["cp1256"]).toString("latin1");
  assert.equal(detectMojibake(garbled), true);
  assert.equal(detectMojibake(v1256.phrase), false);
});
test("search normalization is separate from the preserved original", () => {
  const original = "المباني التعليمية";
  const norm = normalizeForSearch("المبــاني التعليميّة");
  assert.equal(norm, normalizeForSearch(original));
  assert.notEqual(original, norm);
});
