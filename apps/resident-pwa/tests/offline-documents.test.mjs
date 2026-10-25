import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const outbox=read("../lib/offline/document-outbox.ts");
const actions=read("../app/(app)/requests/actions.ts");
const ui=read("../app/(app)/requests/new/page.tsx");
const db=read("../../../supabase/migrations/20261025000002_offline_document_idempotency.sql");
test("document outbox only queues attachment-free drafts and reuses UUID on retry",()=>{
 assert.match(ui,/selectedType\.requirements_json \|\| \[\]/);
 assert.match(ui,/queueDocumentRequest/);
 assert.match(outbox,/form\.append\("requirements","\[\]"\)/);
 assert.match(outbox,/form\.append\("clientOperationId",item\.id\)/);
});
test("server verifies current requirement catalog rather than trusting cached client",()=>{
 assert.match(actions,/\.select\("requirements_json"\)/);
 assert.match(actions,/Document requirements changed/);
 assert.match(actions,/client_operation_id: clientOperationId \|\| null/);
});
test("owner-scoped idempotency prevents duplicate document requests",()=>{
 assert.match(db,/UNIQUE INDEX IF NOT EXISTS/);
 assert.match(db,/resident_id, client_operation_id/);
 assert.match(actions,/reqError\.code === "23505"/);
});

test("replayed document operation IDs cannot change their original payload",()=>{
 assert.match(actions,/existing\.document_type_id !== documentTypeId/);
 assert.match(actions,/existing\.remarks !== purpose/);
 assert.match(actions,/Operation identifier already belongs to a different request/);
});
