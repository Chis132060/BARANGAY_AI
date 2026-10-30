import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const action = readFileSync(new URL("../app/(auth)/register/actions.ts", import.meta.url), "utf8");

test("registration stops instead of duplicating an already verified unlinked household member", () => {
  const householdPreflight = action.split("if (householdCode) {")[1].split("// 1. Create a new account only")[0];
  assert.match(householdPreflight, /verification_status === "Verified"/);
  assert.match(householdPreflight, /!record\.user_id/);
  assert.match(householdPreflight, /record\.birth_date\)\.slice\(0, 10\) === birthDate/);
  assert.match(householdPreflight, /prevent a duplicate resident record/);
});
