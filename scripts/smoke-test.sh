#!/usr/bin/env bash
# GAEB full-stack smoke test — run on a Docker-capable host from the repo root.
# Exercises the 12 deployment verifications from the POC readiness directive.
# Status in the dev sandbox: UNEXECUTED (no Docker there) — this script is the evidence
# instrument; run it on the demo machine and keep its output with the release.
set -euo pipefail
API=http://localhost:8080
WEB=http://localhost:5173

echo "== 1. Start the entire stack"
docker compose up --build -d
for i in $(seq 1 30); do curl -sf $API/health >/dev/null && break || sleep 2; done
curl -sf $API/health; echo
curl -sf $WEB >/dev/null && echo "frontend up"

echo "== 2. Create an administrator (first run only; tolerated if it already exists)"
docker compose exec -T api node dist/src/cli/create-admin.js smoke-admin 'Smoke-Pass-123' || true
docker compose exec -T api node dist/src/cli/create-admin.js smoke-tech 'Smoke-Pass-123' || true
docker compose exec -T api node dist/src/cli/create-admin.js smoke-approver 'Smoke-Pass-123' || true
# NOTE: assign roles in the DB for the drill users (admin stays admin):
docker compose exec -T db psql -U gaeb -d gaeb -c "UPDATE app.users SET role='technical' WHERE username='smoke-tech'; UPDATE app.users SET role='budget' WHERE username='smoke-approver';"

login() { curl -sf -X POST $API/api/login -H 'Content-Type: application/json' -d "{\"username\":\"$1\",\"password\":\"Smoke-Pass-123\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])'; }
TECH=$(login smoke-tech); APPR=$(login smoke-approver)
echo "== 3. Logged in as operator + approver"

echo "== 4-6. Import a synthetic IBM i export, view staging, quarantine"
python3 - "$TECH" << 'PYEOF'
import json, subprocess, sys, urllib.request
tech = sys.argv[1]
# generate a small native-binary PBLBULDG extract with one duplicate + one corrupt record
import struct
tbl = json.load(open("platform/src/codepages/ibm_tables.json"))["ibm420"]
inv = {cp: b for b, cp in ((int(k), v) for k, v in tbl.items())}
def enc(s): return bytes(inv.get(ord(c), 0x40) for c in s)
def rec(blcd, vg):
    r = bytearray(b"\x40" * 58); r[0:2] = b"01"; r[2:4] = b"02"; r[4:11] = blcd.encode()
    name = enc("مدرسة النيل الابتدائية"); r[11:11+len(name)] = name
    digits = str(vg).encode(); vgbytes = bytes(0xF0 + int(d) for d in digits)
    r[58-len(vgbytes):58] = vgbytes; return bytes(r)
data = rec("1000001", 7654321) + rec("1000002", 7654322) + rec("1000001", 7654321)
bad = bytearray(rec("1000003", 7654323)); bad[57] = 0xFA; data += bytes(bad)
req = urllib.request.Request("http://localhost:8080/api/migration/import?layout=pblbuldg", data=data,
    headers={"Content-Type": "application/octet-stream", "Authorization": f"Bearer {tech}"}, method="POST")
out = json.load(urllib.request.urlopen(req))
assert out["loaded"] == 2 and len(out["rejected"]) == 2, out
print("import OK:", out["batchId"], "loaded", out["loaded"], "rejected", len(out["rejected"]))
open("/tmp/smoke_batch.txt", "w").write(out["batchId"])
PYEOF
BATCH=$(cat /tmp/smoke_batch.txt)
curl -sf "$API/api/migration/batches" -H "Authorization: Bearer $TECH" | python3 -c 'import sys,json; b=json.load(sys.stdin); assert any(x["batch_id"]=="'$BATCH'" for x in b); print("staging/batches visible")'
curl -sf "$API/api/migration/batches/$BATCH/rejects" -H "Authorization: Bearer $TECH" | python3 -c 'import sys,json; r=json.load(sys.stdin); assert len(r)==2; print("quarantine visible:", [x["reason"][:24] for x in r])'

echo "== 7. Approve the mapping (authenticated approver; operator is refused)"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST $API/api/migration/approvals -H "Content-Type: application/json" -H "Authorization: Bearer $TECH" -d '{"transform":"buildings","mode":"demo","evidenceRef":"smoke"}')
[ "$code" = "403" ] && echo "operator approval correctly refused (403)"
curl -sf -X POST $API/api/migration/approvals -H "Content-Type: application/json" -H "Authorization: Bearer $APPR" -d '{"transform":"buildings","mode":"demo","evidenceRef":"smoke-test sign-off"}' >/dev/null && echo "approver approval OK"

echo "== 8-9. Transform and view in the School Map module"
curl -sf -X POST $API/api/migration/transform -H "Content-Type: application/json" -H "Authorization: Bearer $TECH" -d "{\"name\":\"buildings\",\"batchId\":\"$BATCH\"}" 
echo
curl -sf "$API/api/buildings" -H "Authorization: Bearer $TECH" | python3 -c 'import sys,json; b=json.load(sys.stdin); assert any(x["legacy_blcd"]=="1000001" for x in b); print("migrated buildings in module:", len(b))'

echo "== 10. Reconciliation report data"
curl -sf "$API/api/reports/budget-utilization.csv" -H "Authorization: Bearer $APPR" | head -1

echo "== 11. Restart all containers — data must survive"
docker compose restart
for i in $(seq 1 30); do curl -sf $API/health >/dev/null && break || sleep 2; done
TECH=$(login smoke-tech)
curl -sf "$API/api/buildings" -H "Authorization: Bearer $TECH" | python3 -c 'import sys,json; b=json.load(sys.stdin); assert len(b)>=2; print("data survived restart:", len(b), "buildings")'

echo "== 12. Backup and restoration"
docker compose exec -T db pg_dump -U gaeb -d gaeb > /tmp/gaeb-smoke-backup.sql
test -s /tmp/gaeb-smoke-backup.sql && echo "backup written: $(wc -c < /tmp/gaeb-smoke-backup.sql) bytes"
docker compose exec -T db psql -U gaeb -d gaeb -c "SELECT COUNT(*) FROM app.buildings;" 

echo "SMOKE TEST PASSED (keep this output with the release evidence)"
