import pymupdf, glob, os, re, json, collections

BASE = "extracted/veebase POC"
SUBSYS = {
 "الموازنه": "Budget", "خريطه مدرسيه نهائى": "School Map",
 "مستخلصات فنيه": "Technical Abstracts", "مشتريات": "Purchases & Contracts",
 "مقايسات": "Estimates (BOQ)", "ملكيه عقاريه": "Real Estate",
}
def subsystem(path):
    for k, v in SUBSYS.items():
        if k in path: return v
    return "Unknown"

files_inv, progs_inv = [], []
stats = collections.Counter()
pdfs = sorted(glob.glob(os.path.join(BASE, "**", "*.pdf"), recursive=True))
seen = set()
for f in pdfs:
    key = f.replace(" (2)", "")
    if " (2)" in f and os.path.exists(key): continue
    if key in seen: continue
    seen.add(key)
    try:
        d = pymupdf.open(f)
        text = "\n".join(d[i].get_text() for i in range(d.page_count))
    except Exception:
        stats["unreadable"] += 1; continue
    if not text.strip():
        stats["no_text"] += 1; continue
    m = re.search(r"SOURCE FILE[\s.]*([A-Z0-9#]+)/([A-Z0-9#]+)", text)
    mm = re.search(r"MEMBER[\s.]+([A-Z0-9#_]+)", text)
    lib = m.group(1) if m else None; srcf = m.group(2) if m else None
    member = mm.group(1) if mm else os.path.basename(f)
    sub = subsystem(f)
    lines = text.splitlines()
    recs = []
    cur = None
    for line in lines:
        rm = re.match(r"\s*\d+\s+(?:A\s+)?R\s+([A-Z0-9#]{2,10})\b", line)
        if rm:
            cur = {"record_format": rm.group(1), "fields": [], "keys": []}
            recs.append(cur); continue
        if cur is None: continue
        km = re.match(r"\s*\d+\s+(?:A\s+)?K\s+([A-Z0-9#]{2,10})\s*$", line)
        if km:
            if km.group(1) not in cur["keys"]: cur["keys"].append(km.group(1))
            continue
        fm = re.match(r"\s*\d+\s+(?:A\s+)?([A-Z0-9#]{2,10})\s+(\d{1,3})\s+(\d)?\s", line)
        if fm and "COLHDG" in line or (fm and re.search(r"\b(VALUES|COLHDG|TEXT|CHECK|EDTCDE|EDTWRD|DFT)\b", line)):
            name = fm.group(1)
            if name not in [x["name"] for x in cur["fields"]]:
                cur["fields"].append({"name": name, "length": int(fm.group(2)),
                                      "decimals": int(fm.group(3)) if fm.group(3) else 0})
    pfile = re.search(r"PFILE\((?:[A-Z0-9#]+/)?([A-Z0-9#]+)\)", text)
    is_sfl = "SFILE(" in text or "SFL" in text
    is_cl = bool(re.search(r"\bDCLF\b|\bSNDRCVF\b", text)) or (member and text.count("CALL") > 2 and "DCL " in text)
    is_rpg = bool(re.search(r"WORKSTN|CHAIN|READE|SETLL", text)) or bool(re.search(r"^\s*\d+\s+F[A-Z0-9#]{3,10}\s", text, re.M))
    if recs and any(r["fields"] for r in recs) or (recs and pfile):
        kind = "LF" if pfile else ("DSPF" if is_sfl else "PF")
        files_inv.append({"subsystem": sub, "library": lib, "source_file": srcf, "member": member,
                          "kind": kind, "based_on": pfile.group(1) if pfile else None,
                          "unique": "UNIQUE" in text[:1600], "records": recs,
                          "pdf": os.path.relpath(f, BASE)})
        stats["dds_" + kind] += 1
    else:
        used = sorted(set(re.findall(r"^\s*\d+\s+F([A-Z0-9#]{3,10})\s", text, re.M)))
        calls = sorted(set(x for pair in re.findall(r"CALL\s+\+?\s*PGM\(([A-Z0-9#]+)\)", text) for x in [pair]))
        kind = "CL" if is_cl else ("RPG" if is_rpg else "OTHER")
        progs_inv.append({"subsystem": sub, "library": lib, "source_file": srcf, "member": member,
                          "type": kind, "files_used": used, "calls": calls,
                          "pages": d.page_count, "pdf": os.path.relpath(f, BASE)})
        stats["programs_" + kind] += 1
    stats["total_unique"] += 1

json.dump({"data_files": files_inv, "programs": progs_inv}, open("legacy_inventory.json", "w"), ensure_ascii=False, indent=1)
print(dict(stats))
print("data files:", len(files_inv), "| programs:", len(progs_inv))
print("files per subsystem:", dict(collections.Counter(f["subsystem"] for f in files_inv)))
print("programs per subsystem:", dict(collections.Counter(p["subsystem"] for p in progs_inv)))
print("total fields:", sum(len(r["fields"]) for f in files_inv for r in f["records"]))
