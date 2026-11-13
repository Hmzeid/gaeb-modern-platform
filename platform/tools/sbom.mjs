// SBOM + license inventory from the installed dependency tree (Phase 7,
// Workstream C.1). Reads node_modules package.json files — works offline,
// unlike npm audit, which the sandbox registry policy blocks (recorded).
// Usage: node tools/sbom.mjs <outDir>
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

const outDir = process.argv[2] ?? ".";
mkdirSync(outDir, { recursive: true });
const seen = new Map();
function scan(dir, depth) {
  if (depth > 6) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const base = `${dir}/${e.name}`;
    const dirs = e.name.startsWith("@") ? readdirSync(base).map(x => `${base}/${x}`) : [base];
    for (const d of dirs) {
      const pj = `${d}/package.json`;
      if (existsSync(pj)) {
        try {
          const p = JSON.parse(readFileSync(pj, "utf8"));
          const key = `${p.name}@${p.version}`;
          if (!seen.has(key)) seen.set(key, { name: p.name, version: p.version,
            license: typeof p.license === "string" ? p.license : (p.license?.type ?? (Array.isArray(p.licenses) ? p.licenses.map(l => l.type).join(", ") : "UNKNOWN")) });
        } catch { /* unreadable package.json: skip */ }
      }
      const nm = `${d}/node_modules`;
      if (existsSync(nm)) scan(nm, depth + 1);
    }
  }
}
scan("node_modules", 0);
const pkgs = [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
const lockHash = existsSync("package-lock.json")
  ? createHash("sha256").update(readFileSync("package-lock.json")).digest("hex") : null;
const sbom = { sbomFormat: "GAEB-SBOM-1", generatedFrom: "node_modules + package-lock.json",
  lockfileSha256: lockHash, componentCount: pkgs.length, components: pkgs };
writeFileSync(`${outDir}/sbom.json`, JSON.stringify(sbom, null, 1));
const csv = ["name,version,license", ...pkgs.map(p => `"${p.name}","${p.version}","${String(p.license).replace(/"/g, "'")}"`)].join("\n");
writeFileSync(`${outDir}/license-inventory.csv`, csv);
const byLicense = {};
for (const p of pkgs) byLicense[p.license] = (byLicense[p.license] ?? 0) + 1;
console.log(JSON.stringify({ components: pkgs.length, lockfileSha256: lockHash, licenses: byLicense }));
