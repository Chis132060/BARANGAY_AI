import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const admin=read("../app/(dashboard)/communication/support-tickets/actions.ts");
const resident=read("../app/(app)/support/page.tsx");
const api=read("../app/api/notifications/subscribe/route.ts");
const migration=read("../../../supabase/migrations/20261023000001_support_tickets.sql");

test("ticket workflow requires RBAC on admin reads and updates",()=>{
 assert.match(admin,/checkUserPermission/);
 assert.match(admin,/"communication",canEdit\?"canEdit":"canView"/);
 assert.match(admin,/authorizedStaff\(true\)/);
 assert.match(admin,/\.eq\("id",id\)/);
});
test("ticket schema restricts resident data by auth uid",()=>{
 assert.match(migration,/enable row level security/);
 assert.match(migration,/resident_user_id=\(select auth.uid\(\)\)/);
 assert.match(migration,/support_tickets_staff_update/);
 assert.doesNotMatch(migration,/support_tickets_resident_update/);
});
test("resident ticket submission uses identity from Supabase Auth",()=>{
 assert.match(resident,/supabase.auth.getUser\(\)/);
 assert.match(resident,/resident_user_id:user.id/);
 assert.match(resident,/staff_reply/);
});
test("push subscription endpoint requires auth and owns endpoints",()=>{
 assert.match(api,/supabase.auth.getUser\(\)/);
 assert.match(api,/\.eq\("user_id", user.id\)/);
 assert.doesNotMatch(api,/onConflict:\s*"endpoint"/);
});
