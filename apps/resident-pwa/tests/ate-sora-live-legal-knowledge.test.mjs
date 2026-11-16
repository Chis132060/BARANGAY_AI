import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const policySource = read("../lib/ai/verified-policy-grounding.ts");
const route = read("../app/api/chat/route.ts");

const compiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
assert.equal(compiled.diagnostics?.filter(x => x.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
const exports = {};
vm.runInNewContext(compiled.outputText, { exports, module: { exports }, URL, Date, console });
const { isPolicyQuestion, isServiceInformationQuestion, getVerifiedPolicyAnswer, getVerifiedServiceAnswer } = exports;

function fakeDb(tables = {}) {
  return {
    from(name) {
      const response = tables[name] ?? { data: [], error: null };
      const query = {
        select() { return query; },
        eq() { return query; },
        in() { return query; },
        or() { return query; },
        not() { return query; },
        limit() { return Promise.resolve(response); },
      };
      return query;
    },
  };
}

const currentLaw = {
  content: "A woman affected by violence can ask the barangay for assistance with a protection order and be referred to appropriate protection services and police. Ordinary barangay mediation must not be used to pressure a survivor into settlement.",
  metadata: {
    title: "RA 9262 — Protection for women and children",
    jurisdiction_scope: "philippines",
    source_reference: "https://pcw.gov.ph/faq-republic-act-9262/",
    keywords: ["asawa", "pananakit", "nananakit", "abuso", "violence", "protection order"],
  },
  trust_level: "VERIFIED",
  published_at: "2026-11-16T00:00:00+08:00",
  source_domain: "pcw.gov.ph",
};

test("policy intent covers common real-world barangay situations without hardcoded law answers", () => {
  for (const q of ["ano yong mga policy sa barangay", "kapitbahay na maingay", "may nananakit sa asawa",
                   "reklamo sa barangay", "proteksyon sa bata", "basura sa kalsada", "batas sa privacy"]) {
    assert.equal(isPolicyQuestion(q), true, q);
  }
  assert.equal(isServiceInformationQuestion("ano ang mga serbisyo at requirements"), true);
  assert.doesNotMatch(policySource, /const (?:NATIONAL_LAWS|HARDCODED_LAWS)\s*=/);
  assert.match(route, /getVerifiedPolicyAnswer\(supabase, message, language\)/);
  assert.match(route, /getVerifiedServiceAnswer\(supabase, message, language\)/);
});

test("verified national law is cited in a targeted real-world complaint, without inventing a local ordinance", async () => {
  const db = fakeDb({ knowledge_chunks: { data: [currentLaw], error: null } });
  const result = await getVerifiedPolicyAnswer(db, "may nananakit sa aking asawa, ano ang batas?", "tgl");
  assert.equal(result.context_used, true);
  assert.match(result.answer, /RA 9262/);
  assert.match(result.answer, /Philippine national law/);
  assert.match(result.answer, /pcw\.gov\.ph\/faq-republic-act-9262/);
  assert.doesNotMatch(result.answer, /Tandang Sora ordinance number: RA 9262/);
});

test("reject unapproved, GENERAL and non-government legal sources even if the database returns them", async () => {
  const general = { ...currentLaw, trust_level: "GENERAL", content: "Illegal unverified ₱9999 fee in this summary" };
  const untrusted = {
    ...currentLaw,
    metadata: { ...currentLaw.metadata, source_reference: "https://example.com/unverified-law" },
  };
  const result = await getVerifiedPolicyAnswer(fakeDb({
    knowledge_chunks: { data: [general, untrusted], error: null },
  }), "ano mga policy sa barangay", "tgl");
  assert.equal(result.context_used, false);
  assert.equal(result.flagged, true);
  assert.doesNotMatch(result.answer, /₱9999|example\.com|RA 9262/);
});

test("service catalogue is dynamic and clearly separate from local ordinances", async () => {
  const document = {
    name: "Barangay Clearance",
    description: "Current request description from the live database",
    requirements_json: ["1 Valid ID", "Proof of Residency"],
  };
  const db = fakeDb({ document_types: { data: [document], error: null } });
  const answer = await getVerifiedServiceAnswer(db, "ano mga serbisyo sa barangay", "tgl");
  assert.equal(answer.context_used, true);
  assert.match(answer.answer, /Barangay Clearance/);
  assert.match(answer.answer, /1 Valid ID/);
  assert.match(answer.answer, /HINDI mga ordinansa/);
  const policy = await getVerifiedPolicyAnswer(db, "ano yong mga policy sa barangay", "tgl");
  assert.match(policy.answer, /wala pang matching/i);
  assert.match(policy.answer, /Barangay Clearance/);
  assert.equal(policy.flagged, true);
  assert.ok(policy.citations.some(c => c.includes("document-service catalog")));
});

test("policy registry only queries effective published records and excludes draft laws", () => {
  assert.match(policySource, /\.eq\("status", "Active"\)/);
  assert.match(policySource, /\.eq\("status", "Published"\)/);
  assert.match(policySource, /\.in\("trust_level", \["VERIFIED", "AUTHORITATIVE"\]\)/);
  assert.match(policySource, /!row\.published_at/);
  assert.match(policySource, /gov\\\.ph/);
  assert.match(policySource, /source_reference/);
  assert.match(route, /if \(isPolicyQuestion\(message\)\)/);
  assert.match(route, /if \(isServiceInformationQuestion\(message\)\)/);
  assert.ok(route.indexOf("if (isPolicyQuestion(message))") < route.indexOf("const apiBaseUrl"));
  assert.ok(route.indexOf("if (isServiceInformationQuestion(message))") < route.indexOf("const apiBaseUrl"));
});
