import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const read = name => readFileSync(new URL(name, import.meta.url), "utf8");
const helper = read("../lib/ai/sora-guest-guide.ts");
const chat = read("../components/chat/ChatInterface.tsx");
const route = read("../app/api/chat/route.ts");

const result = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
const exports = {};
vm.runInNewContext(result.outputText, { exports });
const { getGuestGuideReply } = exports;

test("guest hey is answered locally in the right language, not with 401", () => {
  const tgl = getGuestGuideReply("hey", "tgl");
  assert.match(tgl.text, /Kumusta! Ako si Ate Sora/);
  assert.match(tgl.text, /Walang request na na-submit/);
  assert.equal(tgl.needsSignIn, false);
  assert.match(getGuestGuideReply("hello!", "en").text, /Hello! I'm Ate Sora/);
  assert.match(getGuestGuideReply("maayong buntag", "ceb").text, /Maayong adlaw/);
});

test("guest guidance does not invent verified documents, fees or legal rulings", () => {
  const guide = getGuestGuideReply("Ano ang mga barangay services?", "tgl");
  assert.match(guide.text, /Hindi nito kinukumpirma kung available/);
  assert.equal(guide.needsSignIn, true);
  const fees = getGuestGuideReply("Magkano ang fee ng Barangay Clearance?", "tgl");
  assert.match(fees.text, /Hindi ko makumpirma/);
  assert.doesNotMatch(fees.text, /₱\s*\d+/);
  const crisis = getGuestGuideReply("Sinasaktan ako", "tgl");
  assert.match(crisis.text, /emergency services/);
  assert.equal(crisis.needsSignIn, true);
});

test("unknown guest messages get limited guidance, not fake AI", () => {
  const reply = getGuestGuideReply("Is the road flooded right now?", "en");
  assert.match(reply.text, /needs the live AI and verified records/);
  assert.doesNotMatch(reply.text, /Yes|no flooding today|predicted/);
});

test("guest routing remains before authenticated API calls and local personal-history writes", () => {
  const guest = chat.indexOf("const guestGuide = getGuestGuideReply(userText, ttsLang)");
  const history = chat.indexOf("let persistedSessionId: string | null");
  const api = chat.indexOf('fetch("/api/chat"');
  assert.ok(guest > 0 && guest < history && history < api);
  assert.match(chat, /if \(!isLoggedIn\) \{[\s\S]*?getGuestGuideReply\(userText, ttsLang\)/);
  assert.match(chat, /isGuestGuide: true/);
  assert.match(chat, /Guest Quick Guide · no AI request sent/);
  assert.match(chat, /guestSignInRequired/);
});

test("the server continues to reject unauthenticated AI calls; expired resident sessions have actionable UI", () => {
  assert.match(route, /if \(!user\) \{\s*return NextResponse\.json\(\{ error: "Sign in to use the AI assistant\." \}, \{ status: 401 \}\)/);
  assert.match(chat, /if \(res\.status === 401\)/);
  assert.match(chat, /guestSignInRequired: true/);
  assert.match(chat, /href="\/login"/);
  assert.doesNotMatch(chat, /getGuestGuideReply\([\s\S]*?\).*fetch\("\/api\/chat"/);
});
