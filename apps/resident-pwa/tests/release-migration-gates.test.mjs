import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(name, import.meta.url), "utf8");
const storage = read("../../../supabase/migrations/20261024000001_document_requirement_cleanup_rls.sql");
const quota = read("../../../supabase/migrations/20261024000002_chat_quota.sql");
const chat = read("../app/api/chat/route.ts");

test("storage rollback migration only permits DELETE for authenticated owner", () => {
  assert.match(storage, /FOR DELETE TO authenticated/i);
  assert.match(storage, /bucket_id = 'document-requirements'/);
  assert.match(storage, /storage\.foldername\(name\)/);
  assert.match(storage, /auth\.uid\(\)/);
});
test("chat migration uses atomic counter and does not grant anonymous execution", () => {
  assert.match(quota, /ON CONFLICT \(user_id\) DO UPDATE/i);
  assert.match(quota, /SECURITY DEFINER SET search_path = ''/i);
  assert.match(quota, /REVOKE ALL ON FUNCTION.*FROM PUBLIC, anon/i);
  assert.match(quota, /GRANT EXECUTE ON FUNCTION.*TO authenticated/i);
  assert.match(chat, /consume_chat_rate_limit/);
  assert.doesNotMatch(chat, /rateLimitMap = new Map/);
});
