import json, csv, re
inv = json.load(open("legacy_inventory.json"))
SCHEMA = {"Budget":"budget","School Map":"school_map","Technical Abstracts":"abstracts",
          "Purchases & Contracts":"purchases","Real Estate":"real_estate","Estimates (BOQ)":"estimates"}
def sqltype(f):
    n, L, d = f["name"], f["length"], f["decimals"]
    if d > 0: return f"NUMERIC({L},{d})", "numeric-decimal"
    if re.search(r"(NM|NAME|DESC|TXT|ADDR|NOTE)", n) or L >= 30: return f"VARCHAR({L})", "char-by-name/length"
    if re.search(r"(DT|DAT|DATE)$", n) and L == 8: return "INTEGER", "legacy-date-YYYYMMDD"
    if L <= 9: return "INTEGER", "numeric-int"
    if L <= 18: return "BIGINT", "numeric-bigint"
    return f"VARCHAR({L})", "char-long"
out = ["-- GAEB AS/400 -> PostgreSQL migration DDL (generated from DDS PF definitions parsed from SEU listings)",
       "-- Type inference rules: decimals>0 -> NUMERIC; name/length heuristics otherwise. Review field_map.csv before production use.", ""]
rows = []
seen_tables = {}
for s in sorted(set(SCHEMA.values())): out.append(f"CREATE SCHEMA IF NOT EXISTS {s};")
out.append("")
for f in inv["data_files"]:
    if f["kind"] != "PF": continue
    sch = SCHEMA.get(f["subsystem"], "legacy")
    tbl = f["member"].lower().replace("#", "n_")
    key = (sch, tbl)
    if key in seen_tables: tbl = tbl + "_" + (f["source_file"] or "x").lower()
    seen_tables[key] = True
    out.append(f"-- {f['subsystem']} | legacy {f['library']}/{f['member']} (source {f['source_file']}) | {f['pdf']}")
    cols, pk = [], []
    for r in f["records"]:
        for fld in r["fields"]:
            t, why = sqltype(fld)
            cols.append(f"  {fld['name'].lower()} {t}")
            rows.append([sch, tbl, fld["name"], fld["length"], fld["decimals"], t, why])
        pk = [k.lower() for k in r["keys"]]
    body = ",\n".join(cols)
    if pk and all(any(c.strip().startswith(p + " ") for c in cols) for p in pk):
        body += f",\n  PRIMARY KEY ({', '.join(pk)})"
    out.append(f"CREATE TABLE IF NOT EXISTS {sch}.{tbl} (\n{body}\n);\n")
open("schema.sql", "w").write("\n".join(out))
with open("field_map.csv", "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["schema","table","legacy_field","length","decimals","sql_type","inference_rule"]); w.writerows(rows)
print("tables:", len(seen_tables), "| field rows:", len(rows))
