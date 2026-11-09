import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const route = readFileSync(new URL("../app/api/realtime/session/route.ts", import.meta.url), "utf8");
const hook = readFileSync(new URL("../hooks/useSoraRealtimeVoice.ts", import.meta.url), "utf8");
const chat = readFileSync(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
test("Realtime session authenticates and uses shared quota", () => {
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /consume_chat_rate_limit/);
  assert.match(route, /allowed !== true/);
});
test("Standard OpenAI key stays server-side", () => {
  assert.match(route, /process\.env\.OPENAI_API_KEY/);
  assert.match(route, /api\.openai\.com\/v1\/realtime\/calls/);
  assert.doesNotMatch(hook, /OPENAI_API_KEY/);
});
test("Realtime uses WebRTC and official chat for knowledge", () => {
  assert.match(hook, /RTCPeerConnection/);
  assert.match(hook, /\/api\/chat/);
  assert.match(chat, /consume_chat_rate_limit/);
});
test("Tool results use function_call_output", () => assert.match(hook, /function_call_output/));

test("Realtime voice follows Ate Sora's warm controlled personality", () => {
  assert.match(route, /warm, patient, respectful/);
  assert.match(route, /Ask one focused clarification/);
  assert.match(route, /controlled mode/);
  assert.match(route, /read-only information access/);
  assert.match(route, /Never interpret ambiguous language as consent/);
  assert.match(route, /Never submit, file, approve, deny, edit, delete/);
});
