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

test("top-bar read acknowledgements also enter offline queue",()=>{
 const topBar=read("../components/layout/TopBar.tsx");
 assert.match(topBar,/queueRead\(session\.user\.id,\[id\]\)/);
 assert.match(topBar,/syncReads\(supabase,session\.user\.id\)/);
});
