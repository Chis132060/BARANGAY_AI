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

test("offline AI does not fabricate current official responses",()=>{
 const chat=read("../components/chat/ChatInterface.tsx");
 assert.match(chat,/if \(!navigator\.onLine\)/);
 assert.match(chat,/the online Barangay AI and current official records are unavailable/);
});

test("payment references cannot be reported as submitted while offline",()=>{
 const requests=read("../app/(app)/requests/page.tsx");
 assert.match(requests,/Payment references cannot be submitted offline/);
 assert.match(requests,/if \(!navigator\.onLine\)/);
});

test("offline fallback provides public cached content without pretending to submit",()=>{
 const fallback=read("../app/~offline/page.tsx");
 assert.match(fallback,/loadPublicSnapshot<PublicNotice\[\]>/);
 assert.match(fallback,/NOT yet submitted to the barangay/);
 assert.match(fallback,/listTickets\(session.user.id\)/);
});

test("authenticated shell can initialize from cached session when disconnected",()=>{
 const layout=read("../app/(app)/layout.tsx");
 assert.match(layout,/supabase\.auth\.getSession\(\)/);
 assert.match(layout,/onAuthStateChange/);
 assert.match(layout,/OfflineSyncRunner/);
});
