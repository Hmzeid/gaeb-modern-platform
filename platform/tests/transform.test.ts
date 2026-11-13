import { test } from "node:test";
import assert from "node:assert/strict";
import { TRANSFORMS, BUILDINGS_TRANSFORM, transformHash, runTransform, assertApprovals } from "../src/migration/transform.js";

function fakeDb(approvals: { rows: any[] }, captured: string[]) {
  return { query: async (text: string, values?: unknown[]) => {
    captured.push(text);
    if (text.includes("mig.mapping_approvals")) return approvals;
    if (text.includes("mig.batches")) return { rows: [] }; // no batch provenance in unit fixtures
    return { rowCount: 2 };
  } } as any;
}
function approvalRows(spec: any, hash = transformHash(spec), by: string | null = "fixture-approver") {
  return { rows: spec.fields.map((f: any) => ({ legacy_field: f.legacy, approved_by: by, approved_by_user_id: by === null ? null : 42, transform_hash: hash, mode: "demo", status: "active" })) };
}

test("transform refuses when no approval records exist", async () => {
  await assert.rejects(() => runTransform(fakeDb({ rows: [] }, []), BUILDINGS_TRANSFORM, "mig-x"), /no approval record/);
});
test("transform refuses when the approval was for an altered definition (hash mismatch)", async () => {
  await assert.rejects(() => runTransform(fakeDb(approvalRows(BUILDINGS_TRANSFORM, "deadbeef"), []), BUILDINGS_TRANSFORM, "mig-x"), /DIFFERENT transform definition/);
});
test("transform refuses when the approval is not bound to an authenticated user", async () => {
  await assert.rejects(() => runTransform(fakeDb(approvalRows(BUILDINGS_TRANSFORM, transformHash(BUILDINGS_TRANSFORM), null), []), BUILDINGS_TRANSFORM, "mig-x"), /not bound to an authenticated user/);
});
test("transform refuses revoked approvals and wrong-mode approvals", async () => {
  const revoked = approvalRows(BUILDINGS_TRANSFORM); revoked.rows.forEach((r: any) => r.status = "revoked");
  await assert.rejects(() => runTransform(fakeDb(revoked, []), BUILDINGS_TRANSFORM, "mig-x"), /approval is revoked/);
  const customerMode = approvalRows(BUILDINGS_TRANSFORM); customerMode.rows.forEach((r: any) => r.mode = "customer");
  await assert.rejects(() => runTransform(fakeDb(customerMode, []), BUILDINGS_TRANSFORM, "mig-x"), /requires 'demo' approvals/);
});
test("approved transform executes its insert and reports row count", async () => {
  const captured: string[] = [];
  const n = await runTransform(fakeDb(approvalRows(BUILDINGS_TRANSFORM), captured), BUILDINGS_TRANSFORM, "mig-x");
  assert.equal(n, 2);
  assert.ok(captured.some(c => c.includes("INSERT INTO app.buildings")));
});
test("changing a field mapping changes the transform hash (tamper evidence)", () => {
  const tampered = { ...BUILDINGS_TRANSFORM, fields: [...BUILDINGS_TRANSFORM.fields.slice(0, 2), { legacy: "VGCD", target: "name_en" }] };
  assert.notEqual(transformHash(tampered), transformHash(BUILDINGS_TRANSFORM));
});
test("all four subsystem transforms are registered with evidence-based members", () => {
  assert.deepEqual(Object.keys(TRANSFORMS).sort(), ["buildings", "certificates", "expropriation", "tenders"]);
  assert.equal(TRANSFORMS.tenders.legacyMember, "PBYTENDR");
  assert.equal(TRANSFORMS.certificates.legacyMember, "INV001PF");
  assert.match(TRANSFORMS.certificates.note ?? "", /B-02/);
});
test("assertApprovals passes silently for a fully approved spec", async () => {
  await assertApprovals(fakeDb(approvalRows(TRANSFORMS.tenders), []), TRANSFORMS.tenders);
});
