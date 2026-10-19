import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync(new URL("../app/(dashboard)/documents/actions.ts", import.meta.url), "utf8");
const update = actions.split("export async function updateRequestStatus(")[1];
assert.ok(update, "document status server action exists");

test("invalid document statuses are rejected server-side", () => {
  assert.match(update, /validStatuses/);
  assert.match(update, /Invalid document request status/);
});

test("approval-level transitions require canApprove, not only canEdit", () => {
  assert.match(update, /\["Approved", "Ready for Pickup", "Released", "Completed", "Rejected"\]\.includes\(status\) && !canApprove/);
});

test("invalid fees and unauthorized payment status edits are rejected", () => {
  assert.match(update, /Number\.isFinite\(customFee\)/);
  assert.match(update, /customFee < 0/);
  assert.match(update, /paymentStatus && !canApprove/);
});
