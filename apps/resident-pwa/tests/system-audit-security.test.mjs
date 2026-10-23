import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const middleware = read("../middleware.ts");
const proxy = read("../app/api/tts/route.ts");
const voice = read("../hooks/useSoraVoiceConversation.ts");
const backendAuth = read("../../api/core/auth.py");
const ttsRouter = read("../../api/routers/tts_router.py");
const voiceRouter = read("../../api/routers/voice_router.py");
const backend = read("../../api/main.py");

test("unverified applicants may open private support without unlocking the full resident app", () => {
  assert.match(middleware, /const isSupportRoute = pathname === "\/support"/);
  assert.match(middleware, /!isApprovalRoute && !isAuthCallback && !isSupportRoute/);
  assert.match(middleware, /if \(!user && !isPublic\)/);
});

test("billable speech endpoints enforce verified Supabase bearer token", () => {
  assert.match(backendAuth, /async def require_voice_access/);
  assert.match(backendAuth, /return await require_user\(authorization\)/);
  for (const file of [voiceRouter, ttsRouter]) {
    assert.match(file, /APIRouter\(dependencies=\[Depends\(require_voice_access\)\]\)/);
  }
  assert.match(voiceRouter, /authorization=authorization/);
});

test("resident voice callers forward authenticated tokens and avoid public TTS proxy", () => {
  assert.match(voice, /session\?\.access_token/);
  assert.match(voice, /Authorization: `Bearer \$\{session.access_token\}`/);
  assert.match(proxy, /supabase.auth.getUser\(\)/);
  assert.match(proxy, /Authentication required/);
  assert.match(proxy, /Authorization: `Bearer \$\{session.access_token\}`/);
});

test("FastAPI CORS does not grant credentialed wildcard origins", () => {
  assert.match(backend, /CORS_ALLOWED_ORIGINS/);
  assert.match(backend, /allow_credentials=False/);
  assert.doesNotMatch(backend, /allow_origins=\["\*"\]/);
});

const rpcGrants = read("../../../supabase/migrations/20261024000001_privileged_rpc_grants.sql");
test("privileged RPC grants explicitly restrict anonymous callers", () => {
  for (const name of ["apply_to_barangay_program","review_barangay_program_application","has_module_permission","is_barangay_staff"]) {
    assert.match(rpcGrants, new RegExp("revoke execute on function public\\." + name + "\\("));
  }
  for (const name of ["log_program_attendance","log_program_changes","notify_document_request_change","sync_request_transaction"]) {
    assert.match(rpcGrants, new RegExp("revoke execute on function public\\." + name + "\\("));
  }
});
