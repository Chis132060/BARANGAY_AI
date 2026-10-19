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

test("public updates render before user-specific application status finishes", () => {
  const renderReady = page.indexOf("setLoading(false);", page.indexOf("async function load"));
  const authLookup = page.indexOf("await supabase.auth.getUser();", page.indexOf("async function load"));
  assert.ok(renderReady !== -1 && authLookup !== -1 && renderReady < authLookup);
});

test("realtime changes during an in-flight request queue a follow-up reload", () => {
  assert.match(page, /reloadRequested\.current = true/);
  assert.match(page, /if \(reloadRequested\.current\)/);
});
