import { readFileSync } from "node:fs";

// Arabic source decoding — table-driven, no external codec dependency.
// Tables generated from the glibc charmaps (IBM420, IBM864, CP1256), which derive from
// IBM's published codepage data; generation script: tools/gen_codepages.py (repo root of platform/).
// The original value is ALWAYS preserved; decoding produces a separate Unicode representation.
const TABLES = JSON.parse(readFileSync(new URL("./codepages/ibm_tables.json", import.meta.url), "utf8"));

export type SourceEncoding = "ibm420" | "ibm425" | "windows-1256" | "ibm864" | "utf8";

export function decodeSource(buf: Buffer, enc: SourceEncoding): string {
  if (enc === "utf8") return buf.toString("utf8");
  if (enc === "ibm425") {
    // No verified IBM425 table is available in this build. Mapping it onto another Arabic
    // EBCDIC page would silently corrupt data, so it fails loudly instead (Blocker B-05:
    // confirm the live file CCSID; if it is 425, supply the table and regenerate).
    throw new Error("ibm425 decoding not enabled: no verified mapping table in this build (see docs/BLOCKERS.md B-05)");
  }
  const table = TABLES[enc] as Record<string, number>;
  if (!table) throw new Error(`unsupported encoding: ${enc}`);
  let out = "";
  for (const byte of buf) {
    const cp = table[String(byte)];
    if (cp === undefined) throw new Error(`byte 0x${byte.toString(16)} unmapped in ${enc} — quarantined, not replaced`);
    out += String.fromCodePoint(cp);
  }
  if (enc === "ibm864") out = unshape864(out);
  return out;
}

// IBM864 stores Arabic as shaped presentation forms (glyphs). Decoding reverses the shaping
// to standard Arabic letters using Unicode compatibility decompositions (table-generated).
// This is part of decoding 864 — it is NOT search normalization and never touches identity rules.
function unshape864(s: string): string {
  const map = TABLES["_unshape_ibm864"] as Record<string, string>;
  let out = "";
  for (const ch of s) {
    const base = map[String(ch.codePointAt(0))];
    out += base ?? ch;
  }
  return out;
}

export function detectMojibake(s: string): boolean {
  // Heuristic flag only — never auto-repairs. Arabic text decoded with the wrong codepage
  // shows dense runs of Latin-1 supplement characters with almost no Arabic block chars.
  const arabic = (s.match(/[؀-ۿ]/g) || []).length;
  const latin1 = (s.match(/[-ÿ]/g) || []).length;
  return latin1 >= 3 && latin1 > arabic * 2;
}

/** Search-only normalization (approved use: search indexes). Strips tatweel and diacritics,
 *  unifies alef/yeh forms. Returns a NEW string; the stored original is untouched.
 *  Never apply to identity fields or reference codes. */
export function normalizeForSearch(s: string): string {
  return s
    .replace(/[ـً-ْ]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .trim();
}
