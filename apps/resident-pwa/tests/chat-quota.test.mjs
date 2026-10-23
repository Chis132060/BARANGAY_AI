import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const route = readFileSync(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../supabase/migrations/20261024000002_chat_quota.sql", import.meta.url), "utf8");
test("chat uses atomic shared quota RPC rather than in-memory Map", () => {
  assert.match(route, /supabase\.rpc\("consume_chat_rate_limit"/);
  assert.doesNotMatch(route, /rateLimitMap = new Map/);
  assert.match(route, /if \(!user\)/);
});
test("quota RPC derives identity from auth and revokes anonymous execution", () => {
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /ON CONFLICT \(user_id\) DO UPDATE/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.consume_chat_rate_limit/);
  assert.match(migration, /TO authenticated/);
});
