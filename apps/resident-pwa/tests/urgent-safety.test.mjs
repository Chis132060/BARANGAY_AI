import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const source = read("../lib/ai/urgent-safety.ts");
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
vm.runInNewContext(js, { exports });
const reply = exports.getUrgentSafetyReply;

test("urgent safety covers reported transcript and multilingual personal violence", () => {
  for (const input of ["Hey at this out What should I do if my husband punch me in the face", "My husband punched me", "My partner hits me", "Sinuntok ako ng asawa ko", "Gisumbag ko sa akong bana", "My boyfriend threatened me"]) {
    for (const language of ["tgl", "ceb", "en"]) {
      const answer = reply(input, language);
      assert.ok(answer, input + " " + language);
      assert.match(answer, /VAW Desk/);
    }
  }
});
test("ordinary services, greetings, and legal information are not intercepted", () => {
  for (const input of ["hey ate sora what should i do", "How do I request a Barangay Clearance?", "What is the law on domestic violence?", "How much is a certificate of residency?", "I want to punch a hole in paper"]) assert.equal(reply(input, "en"), null);
});
test("safety runs before form, history, quota and model operations", () => {
  const chat = read("../components/chat/ChatInterface.tsx");
  const route = read("../app/api/chat/route.ts");
  const backend = read("../../api/routers/rag_router.py");
  assert.ok(chat.indexOf("if (urgentSafety)") < chat.indexOf("if (!isOnline) {", chat.indexOf("if (urgentSafety)")));
  assert.ok(route.indexOf("if (urgentSafety)") < route.indexOf("if (!(await checkRateLimit"));
  assert.ok(backend.indexOf("safety = urgent_safety_reply") < backend.indexOf("existing = db.table"));
  assert.match(backend, /rows = existing\.data or \[\]/);
});
