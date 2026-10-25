import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
const snap=read("../lib/offline/public-snapshots.ts");
const draft=read("../lib/offline/document-drafts.ts");
const screen=read("../app/(app)/requests/new/page.tsx");
const announcement=read("../app/(app)/announcements/page.tsx");
test("only allowlisted public data is cached, with bounded expiry",()=>{
 assert.match(snap,/PUBLIC_KEYS = new Set/);
 assert.match(snap,/if \(!PUBLIC_KEYS\.has\(key\)\) throw/);
 assert.match(snap,/expiresAt < Date\.now\(\)/);
 assert.match(announcement,/loadPublicSnapshot<Announcement\[\]>/);
});
test("document drafts are owner-scoped and cannot masquerade as submitted",()=>{
 assert.match(draft,/createIndex\("userId", "userId"\)/);
 assert.match(draft,/getAll\(userId\)/);
 assert.match(screen,/NOT submitted to the barangay/);
 assert.match(screen,/Attachments are not stored/);
});
