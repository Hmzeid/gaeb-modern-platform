import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateTransition } from "../src/workflow.js";
import { can } from "../src/auth.js";

test("estimates: draft -> reviewed requires the review permission", () => {
  estimateTransition("draft", "reviewed", "technical");
  assert.throws(() => estimateTransition("draft", "reviewed", "budget"));   // budget approves, does not review
  assert.throws(() => estimateTransition("draft", "reviewed", "viewer"));
});
test("estimates: approval is a separate permission from review (separation of duties)", () => {
  assert.equal(can("technical", "estimates.review"), true);
  assert.equal(can("technical", "estimates.approve"), false);  // reviewer cannot approve own review
  estimateTransition("reviewed", "approved", "budget");
  assert.throws(() => estimateTransition("reviewed", "approved", "technical"));
});
test("estimates: no skipping — draft cannot jump to approved; approved is terminal", () => {
  assert.throws(() => estimateTransition("draft", "approved", "budget"));
  assert.throws(() => estimateTransition("approved", "draft", "admin"));
});
test("estimates: reviewed can be returned for correction (new revision)", () => {
  estimateTransition("reviewed", "draft", "technical");
});
