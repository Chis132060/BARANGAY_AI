import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const source = read("../lib/ai/sora-offline-service-guide.ts");
const chat = read("../components/chat/ChatInterface.tsx");
const publicSnapshots = read("../lib/offline/public-snapshots.ts");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.filter(x => x.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
const exports = {};
vm.runInNewContext(compiled.outputText, { exports, Date });
const { buildOfflineServiceReply } = exports;

const catalog = {
  cachedAt: Date.parse("2026-11-17T04:00:00Z"),
  stale: true,
  data: [
    { id: "1", name: "Certificate of Indigency", description: "Financial, medical and scholarship assistance certificate." },
    { id: "2", name: "Barangay Clearance", description: "For government transactions." },
  ],
};

test("offline supported document questions use only saved catalog descriptions and warn of staleness", () => {
  const result = buildOfflineServiceReply("Paano kumuha ng Certificate of Indigency?", "tgl", catalog);
  assert.equal(result.savedCatalogUsed, true);
  assert.match(result.answer, /Financial, medical and scholarship assistance certificate/);
  assert.match(result.answer, /Maaaring luma na ito/);
  assert.match(result.answer, /Walang application na na-submit o na-queue/);
  assert.doesNotMatch(result.answer, /₱|requirement is|official fee/i);
});

test("offline app can give generic navigation when catalog never downloaded, without inventing facts", () => {
  const result = buildOfflineServiceReply("Paano mag-request ng Barangay Clearance?", "tgl", null);
  assert.equal(result.savedCatalogUsed, false);
  assert.match(result.answer, /Wala pang saved service catalog/);
  assert.match(result.answer, /Hindi makumpirma offline/);
  assert.match(result.answer, /Kapag online na/);
});

test("saved catalog listing lists only actual saved services, not hardcoded phantom services", () => {
  const result = buildOfflineServiceReply("Ano ang mga barangay services?", "en", catalog);
  assert.equal(result.savedCatalogUsed, true);
  assert.match(result.answer, /Certificate of Indigency/);
  assert.match(result.answer, /Barangay Clearance/);
  assert.doesNotMatch(result.answer, /Business Clearance/);
});

test("fees, ordinances, office hours and eligibility are never fabricated offline", () => {
  for (const query of ["Magkano ang bayad sa clearance?", "Anong ordinansa sa barangay?", "What are the office hours?"]) {
    const result = buildOfflineServiceReply(query, "tgl", catalog);
    assert.ok(result?.answer);
    assert.match(result.answer, /online|offline/);
    assert.doesNotMatch(result.answer, /₱\d|ordinance no|8:00 AM/i);
  }
});

test("incident crises and explicit application submission are not intercepted as offline FAQs", () => {
  for (const query of [
    "Ninakawan ako at kailangan ko ng clearance",
    "Wala kaming makain, kailangan ko ng Certificate of Indigency",
    "I want to request Barangay Clearance",
    "Natatandaan mo ba lahat ng chat natin?",
  ]) {
    assert.equal(buildOfflineServiceReply(query, "tgl", catalog), null, query);
  }
});

test("offline navigation still works for general programs without claiming eligibility", () => {
  const result = buildOfflineServiceReply("May barangay programs ba?", "tgl", null);
  assert.match(result.answer, /naka-save na Programs/);
  assert.match(result.answer, /Hindi ma-verify offline ang eligibility/);
});

test("resident PWA downloads public-only catalog online, but never caches chats or claims offline submission", () => {
  assert.match(chat, /\.from\("document_types"\)[\s\S]*?\.select\("id,name,description"\)/);
  assert.match(chat, /savePublicSnapshot\("document-types", safe, 24 \* 60 \* 60 \* 1000\)/);
  assert.match(chat, /if \(!isOnline\) \{[\s\S]*?buildOfflineServiceReply\(userText, ttsLang, savedCatalog\)/);
  const fromOfflineGuide = chat.indexOf('buildOfflineServiceReply(userText, ttsLang, savedCatalog)');
  const fromActualForm = chat.indexOf("if (userFormRequest.formType && isDocumentFormId(userFormRequest.formType))");
  assert.ok(fromOfflineGuide < fromActualForm);
  assert.match(chat, /isOfflineGuide: true/);
  assert.match(chat, /Offline Quick Guide · not submitted/);
  assert.match(chat, /fetch\("\/api\/chat"/);
  assert.doesNotMatch(chat, /if \(!navigator\.onLine\)/);
  assert.match(publicSnapshots, /PUBLIC_KEYS = new Set/);
  assert.doesNotMatch(publicSnapshots, /"chat_messages"|"chat_sessions"|"residents"/);
});
