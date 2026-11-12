import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, can } from "../src/auth.js";
import { tenderTransition, certTransition, recordDecree, expropriationAction, addWorkingDays } from "../src/workflow.js";

test("password hashing is salted, verifies, and rejects wrong passwords", () => {
  const h1 = hashPassword("correct horse battery");
  const h2 = hashPassword("correct horse battery");
  assert.notEqual(h1, h2); // random salt
  assert.equal(verifyPassword("correct horse battery", h1), true);
  assert.equal(verifyPassword("wrong password here", h1), false);
  assert.throws(() => hashPassword("short"));
});
test("RBAC: viewer cannot write; certifier cannot authorize payment (separation of duties)", () => {
  assert.equal(can("viewer", "buildings.write"), false);
  assert.equal(can("technical", "certificates.certify"), true);
  assert.equal(can("technical", "payment.authorize"), false);
  assert.equal(can("budget", "payment.authorize"), true);
});
test("tender stages cannot be skipped", () => {
  assert.throws(() => tenderTransition("draft", "awarded", "contracts"));
  tenderTransition("draft", "booklet", "contracts"); // legal step passes
});
test("certificate: 'paid' requires a payment reference; sequence is enforced", () => {
  assert.throws(() => certTransition("billed", "paid", "budget"));
  assert.throws(() => certTransition("payment_authorized", "paid", "budget", {}));
  certTransition("payment_authorized", "paid", "budget", { paymentRef: "PAY-2026-001" });
  assert.throws(() => certTransition("draft", "billed", "technical"));
});
test("expropriation: decree gate blocks post-decree actions before the decree exists", () => {
  const c = { stage: "pre_decree" as const };
  assert.throws(() => expropriationAction(c, "final_compensation"));
  const after = recordDecree(c, "PM-123/2026", "2026-03-01", "Gazette 45");
  expropriationAction(after, "final_compensation"); // now allowed
});
test("CHK5DAYS implementation: 5 working days skip Fri/Sat weekend", () => {
  const start = new Date(Date.UTC(2026, 0, 4)); // Sunday Jan 4, 2026
  const end = addWorkingDays(start, 5);
  assert.equal(end.toISOString().slice(0, 10), "2026-01-11"); // Sun+Mon+Tue+Wed+Thu = Jan 5,6,7,8,11? Sun-Thu week: Jan 4 is start (Sun); adding days counts Mon-Thu then next Sun
});
