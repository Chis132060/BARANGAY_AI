import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const intents=read("../lib/offline/program-intents.ts");
const ui=read("../app/(app)/announcements/page.tsx");
test("program queue is user-scoped and server-authoritative",()=>{
 assert.match(intents,/createIndex\("userId","userId"\)/);
 assert.match(intents,/user\?\.id!==userId/);
 assert.match(intents,/apply_to_barangay_program/);
 assert.match(intents,/\.eq\("resident_id",resident\.id\)/);
 assert.match(intents,/\.eq\("program_id",item\.programId\)/);
});
test("offline application never claims a guaranteed slot",()=>{
 assert.match(ui,/NOT submitted or a reserved slot/);
 assert.match(ui,/queueProgramIntent\(session\.user\.id,programId\)/);
});
