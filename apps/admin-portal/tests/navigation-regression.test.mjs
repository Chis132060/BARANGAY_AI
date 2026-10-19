import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sidebar = readFileSync(new URL("../components/layout/Sidebar.tsx", import.meta.url), "utf8");

test("resident child matching respects route segment boundaries", () => {
  assert.match(sidebar, /pathname === child\.href \|\| pathname\.startsWith\(child\.href \+ "\/"\)/);
  assert.doesNotMatch(sidebar, /pathname\.startsWith\(child\.href\)(?! \+)/);
});

test("sidebar uses exact matching for top-level destinations", () => {
  assert.match(sidebar, /pathname === module\.href/);
});
