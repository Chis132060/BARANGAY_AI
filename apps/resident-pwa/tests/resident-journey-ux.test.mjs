import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../app/(app)/home/page.tsx");
const form = read("../app/(app)/requests/new/page.tsx");
const requests = read("../app/(app)/requests/page.tsx");
const layout = read("../app/(app)/layout.tsx");

test("home surfaces direct service, tracking, help, and news actions", () => {
  assert.match(home, /label: "Request a Document"/);
  assert.match(home, /label: "Track My Requests"/);
  assert.match(home, /label: "Ask Ate Sora"/);
  assert.match(home, /label: "Barangay Updates"/);
  assert.match(home, /href: "\/requests\/new\?document=clearance"/);
  assert.match(home, /href: "\/requests\/new\?document=indigency"/);
  assert.match(home, /href: "\/requests\/new\?document=business"/);
});

test("document shortcuts preselect actual available document records", () => {
  assert.match(form, /function findShortcutDocument\(types: DocumentType\[\], shortcut:/);
  assert.match(form, /new URLSearchParams\(window\.location\.search\)\.get\("document"\)/);
  assert.match(form, /if \(matched\) setSelectedType\(matched\)/);
  assert.match(form, /name\.includes\("clearance"\) && !name\.includes\("business"\)/);
  assert.match(form, /aria-pressed=\{isSelected\}/);
});

test("offline form never claims a locally queued application reached the barangay", () => {
  assert.match(form, /Queue on this device/);
  assert.match(form, /queued on this device, not sent yet/);
  assert.match(form, /Saved on this device/);
  assert.match(form, /Offline drafts/);
  assert.match(layout, /<OfflineSyncRunner\s*\/>/);
});

test("request tracking does not invent payment fees or pickup location and hours", () => {
  assert.match(requests, /const hasConfirmedFee = Number\.isFinite\(fee\) && fee >= 0/);
  assert.match(requests, /"To be confirmed"/);
  assert.match(requests, /function getRequestNextStep\(status: string\)/);
  assert.doesNotMatch(requests, /Frontline Window 2/);
  assert.doesNotMatch(requests, /\(8:00 AM - 5:00 PM\)/);
  assert.match(requests, /Confirm office hours before visiting/);
});

test("empty request list directs resident to a new application", () => {
  assert.match(requests, /href="\/requests\/new"/);
  assert.match(requests, /View all requests/);
});
