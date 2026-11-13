import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const formSource = read("../lib/ai/document-forms.ts");
const chatSource = read("../components/chat/ChatInterface.tsx");
const inlineFormSource = read("../components/chat/InChatFormCard.tsx");
const actionSource = read("../app/(app)/requests/actions.ts");

const compiled = ts.transpileModule(formSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((compiled.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
const cjs = { exports: {} };
vm.runInNewContext(compiled.outputText, { module: cjs, exports: cjs.exports });
const { requestedDocumentForm } = cjs.exports;

test("Ate Sora recognizes natural-language document questions and avoids cross-service ambiguity", () => {
  assert.equal(requestedDocumentForm("Unsaon pagkuha og Barangay Clearance?"), "clearance");
  assert.equal(requestedDocumentForm("Paano kumuha ng barangay clearance?"), "clearance");
  assert.equal(requestedDocumentForm("How can I request a Certificate of Indigency?"), "indigency");
  assert.equal(requestedDocumentForm("How can I apply for a Certificate of Residency?"), "residency");
  assert.equal(requestedDocumentForm("How do I get Business Clearance?"), "business");
  assert.equal(requestedDocumentForm("Barangay Clearance at Business Clearance"), null);
  assert.equal(requestedDocumentForm("Where is the barangay office?"), null);
});

test("Ate Sora attempts the actual API even when browser offline hint is wrong", () => {
  assert.doesNotMatch(chatSource, /if\s*\(\s*!navigator\.onLine\s*\)\s*\{\s*setMessages/);
  assert.match(chatSource, /fetch\("\/api\/chat"/);
  assert.match(chatSource, /const networkFailed = err instanceof TypeError/);
});

test("chat presents a real in-chat form backed by authoritative requirements", () => {
  assert.match(chatSource, /<InChatFormCard/);
  assert.match(inlineFormSource, /\.from\("document_types"\)/);
  assert.match(inlineFormSource, /\.select\("id,name,description,requirements_json"\)/);
  assert.match(inlineFormSource, /submitDocumentRequest\(payload\)/);
  assert.doesNotMatch(inlineFormSource, /fee:\s*(50|30|500)\b/);
  assert.doesNotMatch(inlineFormSource, /\.from\("request_transactions"\)\.insert/);
});

test("submission remains idempotent and does not mark unknown fees as FREE", () => {
  assert.match(actionSource, /client_operation_id/);
  assert.match(actionSource, /fee_amount:\s*null/);
  assert.match(actionSource, /payment_status:\s*"Pending"/);
  assert.match(actionSource, /verification_status !== "Verified"/);
});
