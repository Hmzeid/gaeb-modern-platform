import { test } from "node:test";
import assert from "node:assert/strict";
import { BUILDINGS_TRANSFORM, checkRegisterApprovals, buildTransformInsert } from "../src/migration/transform.js";

const header = "legacy_member,target_schema,target_table,legacy_field,length,decimals,sql_type,inference_rule,approval_status,source_lineage";
const approvedCsv = [header,
  "PBLBULDG,school_map,pblbuldg,BLCD,7,0,INTEGER,x,Approved — integration fixture,lineage",
  "PBLBULDG,school_map,pblbuldg,SHNM,40,0,VARCHAR(40),x,Approved — integration fixture,lineage",
  "PBLBULDG,school_map,pblbuldg,VGCD,7,0,INTEGER,x,Approved — integration fixture,lineage"].join("\n");
const pendingCsv = approvedCsv.replaceAll("Approved — integration fixture", "Generated — pending approval");

test("transform is refused while any mapped field lacks register approval", () => {
  assert.throws(() => checkRegisterApprovals(pendingCsv, BUILDINGS_TRANSFORM), /not Approved/);
});
test("transform proceeds when every mapped field is approved", () => {
  checkRegisterApprovals(approvedCsv, BUILDINGS_TRANSFORM);
});
test("transform SQL is a set-based insert from the batch's staged rows, idempotent on the natural key", () => {
  const q = buildTransformInsert(BUILDINGS_TRANSFORM);
  assert.match(q.text, /INSERT INTO app\.buildings \(legacy_blcd, name_ar, village_code\) SELECT blcd::text, shnm, vgcd FROM school_map\.pblbuldg WHERE _batch_id = \$1 ON CONFLICT \(legacy_blcd\) DO NOTHING/);
});
