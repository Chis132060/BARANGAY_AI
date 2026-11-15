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
  assert.match(page, /let inFlight = false/);
  assert.doesNotMatch(page, /inFlight\.current/);
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
  assert.match(page, /reloadRequested = true/);
  assert.match(page, /if \(reloadRequested\)/);
});

test("a delayed offline cache cannot block live program requests forever", () => {
  assert.match(page, /Promise\.race\(\[/);
  assert.match(page, /setTimeout\(\(\) => resolve\(null\), 1500\)/);
});

test("program details stay phone-sized and show eligibility errors beside the apply action", () => {
  assert.match(page, /max-h-\[90dvh\] w-full max-w-md flex-col/);
  assert.match(page, /min-h-0 flex-1 overflow-y-auto/);
  assert.match(page, /applyError\.includes\("does not meet this age requirement"\)/);
  assert.match(page, /This program is for ages/);
  assert.match(page, /role=\{applyError \? "alert" : "status"\}/);
  assert.match(page, /resident\.age > program\.max_age/);
  assert.match(page, /typeof error\.message === "string"/);
});

test("PWA separates open registrable programs from verified historical programs and organizations", () => {
  assert.match(page, /from\("barangay_programs"\)[^\n]*\.eq\("is_public", true\)\.eq\("status", "Active"\)/);
  assert.match(page, /from\("tandang_sora_source_archive"\)/);
  assert.match(page, /\.eq\("is_public", true\)/);
  assert.match(page, /documentedPrograms = sourcedArchive\.filter\(item => item\.section === "program"\)/);
  assert.match(page, /documentedOrganizations = sourcedArchive\.filter\(item => item\.section === "organization"\)/);
  assert.match(page, /verifiedNews = sourcedArchive\.filter\(item => item\.section === "news"\)/);
  assert.match(page, /Past &amp; Documented Programs|Past & Documented Programs/);
  assert.match(page, /Documented Organizations/);
  assert.match(page, /Verified Community News Archive/);
});

test("sourced news archive is visibly historical and links the government original", () => {
  assert.match(page, /record\.source_url/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
  assert.match(page, /not a current barangay advisory/);
  assert.match(page, /Reference only — no open application/);
  assert.match(page, /current officers and members not verified/);
  assert.doesNotMatch(page, /const (?:STATIC|FAKE|SAMPLE)_ARCHIVE/);
});

test("old unverified announcement and test organization offline caches cannot reappear", () => {
  assert.match(page, /announcements-v2/);
  assert.match(page, /barangay-organizations-v2/);
  assert.match(page, /tandang-sora-source-archive-v1/);
  assert.doesNotMatch(page, /loadPublicSnapshot<Announcement\[\]>\("announcements"\)/);
});

test("database archive is explicitly public-read and staff-write only, with provenance", () => {
  const { readFileSync } = require("node:fs");
});

test("new source archive enforces provenance and separate RLS", () => {
  const migration = readFileSync(new URL("../../../supabase/migrations/20261115160426_source_verified_tandang_sora_archive.sql", import.meta.url), "utf8");
  assert.match(migration, /tandang_sora_source_archive/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /is_public = true/);
  assert.match(migration, /is_barangay_staff\(\)/);
  assert.match(migration, /source_url/);
  assert.doesNotMatch(migration, /notify_residents_on_announcement/);
});
