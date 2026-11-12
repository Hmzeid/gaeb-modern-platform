import json, csv, collections
inv = json.load(open("migration/legacy_inventory.json"))
PARTIAL_FILES = {  # modern POC implements a functional equivalent (not the reconciled table itself)
 "PBLBULDG":"School Map buildings registry (POC)","PBLSCHOL":"School Map buildings registry (POC)",
 "CBABDALW":"Budget allocations (POC)","CBARECPF":"Budget receipts (POC)","CBABGALW":"Budget allowances (POC)",
 "PBYTENDR":"Purchases tenders (POC)","PBYPARTT":"Purchases tender parts (POC)","PBYCLAIM":"Purchases claims (POC)",
 "PBYSUPL":"Supplier master (POC)","INV001PF":"Payment certificates (POC)","INVO01PF":"Payment certificates (POC)",
 "INM001PF":"Maintenance certificates (POC)","REMV01PF":"Expropriation cases (POC)","PRC002PF":"Land registry (POC)",
 "RNT003PF":"Leases (POC)","PBLLND04":"Land registry (POC)"}
PARTIAL_PROGS = {
 "BLCD01AR":"Building registry hub — POC implements registry CRUD; sub-program dispatch (BLCD02–24) not yet implemented",
 "CBA009OR":"Budget payment entry family — POC implements allocations/payments; cloned variants collapse to one module (planned)",
 "INV001AR1":"Abstract entry — POC implements certificate items, quantity×price, typed deductions, status workflow; billing/payment separation partial",
 "INV005AR":"Abstract entry variant — see INV001AR1","INM001AR1":"Maintenance abstracts — POC partial",
 "PMPITMAR":"Estimate item entry — POC implements catalogue-based BOQ items (partial)",
 "REMV01AR":"Expropriation pre-decree entry — POC implements case record; decree gate enforced in production backend",
 "REMV02AR":"Expropriation post-decree — POC partial","LND13AR":"Land approval — POC partial (lands CRUD)",
 "GRN002AR":"Real-estate approval + printed approval — POC partial (no print template yet)",
 "SUM408R":"Statistics roll-up — POC dashboard aggregates (partial)","BLCD30AR":"Data-quality report — not yet implemented as report; listed partial via dashboard concept only",
}
rows = []
for f in inv["data_files"]:
    st = "Partially implemented" if f["member"] in PARTIAL_FILES else "Not implemented"
    note = PARTIAL_FILES.get(f["member"], "")
    if f["kind"] == "LF":
        st, note = "Not implemented", f"Converts to index/view over {f.get('based_on') or 'its physical file'} in target schema"
    rows.append(["data_file", f["subsystem"], f["member"], f["kind"], f.get("source_file") or "", st, note])
for p in inv["programs"]:
    st = "Partially implemented" if p["member"] in PARTIAL_PROGS else "Not implemented"
    note = PARTIAL_PROGS.get(p["member"], "")
    if p["type"] == "OTHER" and not note:
        note = "Member type unconfirmed by POC parser (likely display/printer/menu source) — requires source review"
    rows.append(["program", p["subsystem"], p["member"], p["type"], p.get("source_file") or "", st, note])
with open("migration/reconciled/coverage_matrix.csv", "w", newline="") as fh:
    w = csv.writer(fh); w.writerow(["object_kind","subsystem","legacy_member","legacy_type","source_file","modern_status","notes"]); w.writerows(rows)
c = collections.Counter(r[5] for r in rows)
print("coverage rows:", len(rows), dict(c))
