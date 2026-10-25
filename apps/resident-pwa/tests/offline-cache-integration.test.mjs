import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");

test("offline status panel is mounted and manual sync is wired", () => {
  const layout = read("../app/(app)/layout.tsx");
  const panel = read("../components/offline/OfflineStatusCenter.tsx");
  const runner = read("../components/offline/OfflineSyncRunner.tsx");
  assert.match(layout, /<OfflineStatusCenter\s*\/>/);
  assert.match(panel, /barangay-sync-request/);
  assert.match(runner, /addEventListener\("barangay-sync-request"/);
  assert.match(runner, /barangay-sync-status/);
});
test("navigation doesn't runtime-cache authenticated HTML", () => {
  const config = read("../next.config.js");
  assert.match(config, /request\.mode === "navigate"/);
  assert.match(config, /handler: "NetworkOnly"/);
  assert.match(config, /document: "\/~offline"/);
});
test("request summaries exclude document contents and are user-scoped", () => {
  const implementation = read("../lib/offline/request-summaries.ts");
  assert.match(implementation, /userId/);
  assert.match(implementation, /MAX_ITEMS/);
  assert.match(implementation, /id: r.id, status: r.status, requested_date: r.requested_date/);
  assert.match(implementation, /store.get\(userId\)/);
});

test("storage health probes an IndexedDB write and reports quota", () => {
  const source = read("../lib/offline/storage-health.ts");
  assert.match(source, /indexedDB\.open\(probeName/);
  assert.match(source, /transaction\("probe", "readwrite"\)/);
  assert.match(source, /storage\?\.estimate/);
});
test("sync errors are not presented as fully successful", () => {
  const source = read("../components/offline/OfflineSyncRunner.tsx");
  assert.match(source, /state: failed \? "error" : "success"/);
});

test("private cached request history is cleared on sign out or account switch", () => {
  const layout = read("../app/(app)/layout.tsx");
  assert.match(layout, /clearRequestSummaries\(previousUserId\)/);
  assert.match(layout, /SIGNED_OUT/);
});
test("offline fallback renders saved program and organization snapshots", () => {
  const fallback = read("../app/~offline/page.tsx");
  assert.match(fallback, /barangay-programs/);
  assert.match(fallback, /barangay-organizations/);
});
