import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const faqSource = read("../lib/ai/verified-service-faq.ts");
const chatSource = read("../app/api/chat/route.ts");
const uiSource = read("../components/chat/ChatInterface.tsx");

const transpiled = ts.transpileModule(faqSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal((transpiled.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
const cjs = { exports: {} };
vm.runInNewContext(transpiled.outputText, { module: cjs, exports: cjs.exports });
const { matchServiceFaq, buildServiceFaqAnswer, buildServiceFaqUnavailable } = cjs.exports;

test("Cebuano basic clearance question is a deterministic, token-free FAQ candidate", () => {
  assert.equal(matchServiceFaq("Unsaon pagkuha og Barangay Clearance?")?.id, "clearance");
  assert.equal(matchServiceFaq("Paano kumuha ng Barangay Clearance?")?.id, "clearance");
  assert.equal(matchServiceFaq("How do I request Barangay Clearance?")?.id, "clearance");
});

test("all four existing services match with no hardcoded IDs", () => {
  assert.equal(matchServiceFaq("How can I request a Certificate of Indigency?")?.id, "indigency");
  assert.equal(matchServiceFaq("Paano mag-apply ng Certificate of Residency?")?.id, "residency");
  assert.equal(matchServiceFaq("How do I get a Business Clearance?")?.id, "business");
  assert.equal(matchServiceFaq("How do I apply for Barangay Clearance and Business Clearance?"), null);
  assert.equal(matchServiceFaq("How do I apply for Clearance and Indigency?"), null);
});

test("dynamic facts and unusual input do not get misleading FAQ answers", () => {
  assert.equal(matchServiceFaq("Paano kumuha ng Barangay Clearance at magkano ang bayad?"), null);
  assert.equal(matchServiceFaq("Unsaon pagkuha og Barangay Clearance, pila ang bayad?"), null);
  assert.equal(matchServiceFaq("What is the processing time for Barangay Clearance?"), null);
  assert.equal(matchServiceFaq("How do I request Barangay Clearance for me@example.org?"), null);
  assert.equal(matchServiceFaq("clearance"), null);
  assert.equal(matchServiceFaq("How do I request a clearance? " + "x".repeat(240)), null);
});

test("FAQ answers provide a usable path, not unverified amounts or office hours", () => {
  for (const language of ["tgl", "ceb", "en"]) {
    const answer = buildServiceFaqAnswer(
      matchServiceFaq("How do I request Barangay Clearance?"), language
    );
    assert.match(answer, /Requests > Request Document/);
    assert.match(answer, /Barangay Clearance/);
    assert.doesNotMatch(answer, /₱\d|Frontline Window|8:00 AM|5:00 PM/);
    assert.ok(answer.length > 120);
    const business = buildServiceFaqAnswer(
      matchServiceFaq("How do I request Business Clearance?"), language
    );
    assert.match(business, /Book an Appointment/);
  }
  assert.match(buildServiceFaqUnavailable(
    matchServiceFaq("How do I request Barangay Clearance?"), "ceb"
  ), /Dili pa nako makumpirma/);
});

test("FAQ is strictly after auth and shared quota but before agents and backend", () => {
  const quota = chatSource.indexOf("if (!(await checkRateLimit(");
  const faq = chatSource.indexOf("const faq = matchServiceFaq(message)");
  const agent = chatSource.indexOf("const agentResponse = await runSoraAgent(");
  const backend = chatSource.indexOf("const fastApiRes = await fetch(");
  assert.ok(quota > 0 && faq > quota && agent > faq && backend > faq);
  assert.match(chatSource, /\.from\("document_types"\)\s*\.select\("id,name"\)/);
  assert.match(chatSource, /\.eq\("name", faq.documentName\)\s*\.limit\(2\)/);
  assert.match(chatSource, /data\.length === 1/);
  assert.match(chatSource, /tokensPrompt: 0,\s*tokensCompletion: 0/);
  assert.match(chatSource, /query: "SERVICE_FAQ:" \+ faq\.id/);
  assert.match(chatSource, /catalogVerified \? buildServiceFaqAnswer/);
});

test("UI does not promise that all suggestion answers are verified", () => {
  assert.doesNotMatch(uiSource, /instant verified answers/i);
  assert.doesNotMatch(uiSource, /para sa agarang sagot at application form/);
});
