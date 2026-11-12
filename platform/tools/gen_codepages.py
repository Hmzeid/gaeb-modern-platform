"""Regenerates src/codepages/ibm_tables.json from the system glibc charmaps
(IBM420, IBM864, CP1256) plus Unicode compatibility decompositions for IBM864
presentation-form unshaping. Provenance: glibc i18n charmaps (IBM codepage data).
Run on any Linux host with the glibc charmap package installed."""
import gzip, re, json, unicodedata, os
def load(name):
    txt = gzip.open(f"/usr/share/i18n/charmaps/{name}.gz", "rt", errors="replace").read()
    dec, enc = {}, {}
    for m in re.finditer(r"<U([0-9A-Fa-f]{4,6})>\s+/x([0-9A-Fa-f]{2})\b", txt):
        cp, b = int(m.group(1), 16), int(m.group(2), 16)
        dec.setdefault(b, cp); enc.setdefault(cp, b)
    return dec, enc
tables = {}
for name, key in [("IBM420", "ibm420"), ("IBM864", "ibm864"), ("CP1256", "windows-1256")]:
    dec, _ = load(name)
    tables[key] = {str(b): cp for b, cp in sorted(dec.items())}
dec864, _ = load("IBM864")
unshape = {}
for b, cp in dec864.items():
    if 0xFB50 <= cp <= 0xFEFF:
        d = unicodedata.decomposition(chr(cp))
        if d:
            toks = d.split(); hexes = toks[1:] if toks[0].startswith("<") else toks
            parts = [int(x, 16) for x in hexes]
            if all(0x0600 <= p <= 0x06FF for p in parts):
                unshape[str(cp)] = "".join(chr(p) for p in parts)
tables["_unshape_ibm864"] = unshape
out = os.path.join(os.path.dirname(__file__), "..", "src", "codepages", "ibm_tables.json")
json.dump(tables, open(out, "w"), ensure_ascii=False)
print("wrote", out, {k: len(v) for k, v in tables.items()})
