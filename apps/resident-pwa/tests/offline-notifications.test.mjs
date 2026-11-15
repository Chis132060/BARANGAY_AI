import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const queue=read("../lib/offline/notification-outbox.ts");
const ui=read("../app/(app)/notifications/page.tsx");
test("offline mark-read operations are replay-safe owner-scoped updates",()=>{
 assert.match(queue,/update\(\{read_status:true\}\)/);
 assert.match(queue,/eq\("user_id",userId\)/);
 assert.match(queue,/user\?\.id!==userId/);
 assert.match(ui,/await queueRead\(user\.id,ids\)/);
});
test("notification page queues before attempting to synchronize",()=>{
 assert.ok(ui.indexOf("await queueRead(user.id,ids)") < ui.indexOf("await syncReads(supabase,user.id)"));
});

test("notification center owns read acknowledgements; header no longer duplicates it",()=>{
 const topBar=read("../components/layout/TopBar.tsx");
 const nav=read("../components/layout/BottomNav.tsx");
 const profile=read("../app/(app)/profile/page.tsx");
 assert.doesNotMatch(topBar, /<Bell\b|href="\/notifications"|queueRead/);
 assert.match(topBar, /navigator\.onLine/);
 assert.match(nav, /countActiveRequests/);
 assert.match(nav, /countUnseenAnnouncements/);
 assert.match(profile, /Open Notification Center/);
});
