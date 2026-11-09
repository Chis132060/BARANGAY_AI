import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/(app)/layout.tsx", import.meta.url), "utf8");
const profile = readFileSync(new URL("../app/(app)/profile/page.tsx", import.meta.url), "utf8");

test("routine sync details do not occupy the global resident layout", () => {
  assert.doesNotMatch(layout, /<OfflineStatusCenter\s*\/>/);
  assert.match(layout, /<OfflineSyncRunner\s*\/>/, "background sync must remain active");
  assert.match(layout, /<ConnectionBanner\s*\/>/, "actual offline warning must remain available");
});

test("offline queue and manual sync are available under Profile settings", () => {
  assert.match(profile, /setActiveModal\("Offline & Sync"\)/);
  assert.match(profile, /activeModal === "Offline & Sync"[\s\S]*?<OfflineStatusCenter\s*\/>/);
  assert.doesNotMatch(profile, /syncStatusEnabled|toggleSyncStatus/);
});
