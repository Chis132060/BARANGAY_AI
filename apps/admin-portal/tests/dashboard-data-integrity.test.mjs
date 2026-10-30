import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync(new URL("../app/(dashboard)/dashboard/actions.ts", import.meta.url), "utf8");

test("dashboard fails visibly when any metric query returns a database error", () => {
  assert.match(actions, /const queryResults = await Promise\.all\(/);
  assert.match(actions, /queryResults\.flatMap\(\(result: any\) => result\.error/);
  assert.match(actions, /throw new Error\(`Dashboard metrics unavailable:/);
});

test("population and demographic distributions consistently count verified residents", () => {
  assert.match(actions, /select\("\*", \{ count: "exact", head: true \}\)\.eq\("verification_status", "Verified"\)/);
  assert.match(actions, /select\("birth_date"\)\.eq\("verification_status", "Verified"\)/);
  assert.doesNotMatch(actions, /totalFamilies:/);
});
