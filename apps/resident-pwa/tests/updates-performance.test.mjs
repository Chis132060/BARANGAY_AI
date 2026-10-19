import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/(app)/announcements/page.tsx", import.meta.url), "utf8");

test("updates fetches programs and announcements concurrently", () => {
  assert.match(page, /Promise\.all\(/);
  assert.match(page, /from\("announcements"\)/);
  assert.match(page, /from\("barangay_programs"\)/);
});

test("realtime refresh coalesces requests and retains prior results on query error", () => {
  assert.match(page, /inFlight\.current/);
  assert.match(page, /lastLoadAt\.current/);
  assert.match(page, /if \(!ann\.error\)/);
  assert.match(page, /if \(!prog\.error\)/);
});
