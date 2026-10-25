import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");
const outbox=read("../lib/offline/support-outbox.ts");
const support=read("../app/(app)/support/page.tsx");
const migration=read("../../../supabase/migrations/20261025000001_offline_support_idempotency.sql");
test("outbox persists to IndexedDB with user-specific lookup",()=>{
 assert.match(outbox,/indexedDB\.open\(/);
 assert.match(outbox,/createIndex\("userId", "userId"\)/);
 assert.match(outbox,/getAll\(userId\)/);
});
test("sync uses stable idempotency key, auth recheck, and never drops transient errors",()=>{
 assert.match(outbox,/client_operation_id: item\.id/);
 assert.match(outbox,/user\?\.id !== userId/);
 assert.match(outbox,/insertError\?\.code === "23505"/);
 assert.match(outbox,/eq\("client_operation_id", item.id\)/);
 assert.match(outbox,/attempts: item\.attempts \+ 1/);
});
test("support UI distinguishes locally queued from official submission",()=>{
 assert.match(support,/Saved on this device/);
 assert.match(support,/not yet received by the barangay/);
 assert.match(support,/window\.addEventListener\("online"/);
});
test("server enforces unique owner-scoped replay keys",()=>{
 assert.match(migration,/UNIQUE INDEX IF NOT EXISTS/);
 assert.match(migration,/resident_user_id, client_operation_id/);
});

test("privacy concerns bypass unencrypted offline outbox",()=>{
 assert.match(support,/if \(category === "Privacy"\)/);
 assert.match(support,/Privacy concerns require an online connection/);
 assert.ok(support.indexOf('if (category === "Privacy")') < support.indexOf('const item:OfflineTicket'));
});

test("offline support queue bounds storage and transient retries",()=>{
 assert.match(outbox,/pending\.length >= 20/);
 assert.match(outbox,/nextRetryAt > Date\.now\(\)/);
 assert.match(outbox,/Math\.min\(15 \* 60_000/);
});
