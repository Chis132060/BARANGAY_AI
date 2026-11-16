import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const policySource = read("../lib/ai/verified-policy-grounding.ts");
const route = read("../app/api/chat/route.ts");
const migration = read("../../supabase/migrations/20261116053354_published_verified_legal_sources_catalog.sql");
const secureMigration = read("../../supabase/migrations/20261116053259_restore_private_knowledge_chunks_and_docs.sql");

const compiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.filter(x => x.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
const exports = {};
vm.runInNewContext(compiled.outputText, { exports, module: { exports }, URL, Date, console });
const { isPolicyQuestion, isServiceInformationQuestion, getVerifiedPolicyAnswer, getVerifiedServiceAnswer } = exports;

function fakeDb(tables = {}) {
  const accessed = [];
  return {
    accessed,
    from(name) {
      accessed.push(name);
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

const nationalLaw = {
  title: "RA 9262 — Protection for women and children",
  source_url: "https://pcw.gov.ph/faq-republic-act-9262/",
  jurisdiction_scope: "philippines",
  authority: "national_law",
  summary: "A woman affected by violence can ask the barangay for assistance with a protection order and be referred to appropriate protection services and police. Ordinary barangay mediation must not be used to pressure a survivor into settlement.",
  keywords: ["asawa", "pananakit", "nananakit", "abuso", "violence", "protection order"],
  status: "Published",
  verified_at: "2026-11-16T00:00:00+08:00",
};

test("policy intent covers real barangay problems without hardcoded legal answers", () => {
  for (const q of ["ano yong mga policy sa barangay", "kapitbahay na maingay", "may nananakit sa asawa",
                   "reklamo sa barangay", "proteksyon sa bata", "basura sa kalsada", "batas sa privacy"]) {
    assert.equal(isPolicyQuestion(q), true, q);
  }
  assert.equal(isServiceInformationQuestion("ano ang mga serbisyo at requirements"), true);
  assert.doesNotMatch(policySource, /const (?:NATIONAL_LAWS|HARDCODED_LAWS)\s*=/);
  assert.match(route, /getVerifiedPolicyAnswer\(supabase, message, language\)/);
  assert.match(route, /getVerifiedServiceAnswer\(supabase, message, language\)/);
});

test("published national law produces cited, scoped guidance without exposing private knowledge", async () => {
  const db = fakeDb({ verified_legal_sources: { data: [nationalLaw], error: null } });
  const result = await getVerifiedPolicyAnswer(db, "may nananakit sa aking asawa, ano ang batas?", "tgl");
  assert.equal(result.context_used, true);
  assert.match(result.answer, /RA 9262/);
  assert.match(result.answer, /Philippine national law/);
  assert.match(result.answer, /pcw\.gov\.ph\/faq-republic-act-9262/);
  assert.doesNotMatch(result.answer, /Tandang Sora ordinance number: RA 9262/);
  assert.ok(db.accessed.includes("verified_legal_sources"));
  assert.ok(!db.accessed.includes("knowledge_chunks"));
  assert.ok(!db.accessed.includes("knowledge_docs"));
});

test("archived, missing-verification and non-government source rows fail closed", async () => {
  const archived = { ...nationalLaw, status: "Archived" };
  const unverified = { ...nationalLaw, verified_at: null };
  const untrusted = { ...nationalLaw, source_url: "https://example.com/not-a-gov-source" };
  const fakeGov = { ...nationalLaw, source_url: "https://pcw.gov.ph.evil.com/source" };
  const db = fakeDb({ verified_legal_sources: { data: [archived, unverified, untrusted, fakeGov], error: null } });
  const result = await getVerifiedPolicyAnswer(db, "ano mga policy sa barangay", "tgl");
  assert.equal(result.context_used, false);
  assert.equal(result.flagged, true);
  assert.doesNotMatch(result.answer, /RA 9262|evil\.com|example\.com/);
});

test("service catalog is dynamic and separate from ordinances", async () => {
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
  assert.match(policy.answer, /Wala pang matching/i);
  assert.match(policy.answer, /Barangay Clearance/);
  assert.equal(policy.flagged, true);
  assert.ok(policy.citations.some(c => c.includes("document-service catalog")));
});

test("published legal sources RLS is read-only; raw knowledge remains private", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.verified_legal_sources/i);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /TO authenticated/i);
  assert.match(migration, /status\s*=\s*'Published'/i);
  assert.match(secureMigration, /REVOKE SELECT ON TABLE public\.knowledge_chunks FROM authenticated/i);
  assert.match(policySource, /\.from\("verified_legal_sources"\)/);
  assert.match(policySource, /\.eq\("status", "Published"\)/);
  assert.doesNotMatch(policySource, /\.from\("knowledge_chunks"\)/);
  assert.match(policySource, /officialUrl\.hostname/);
  assert.match(route, /if \(isPolicyQuestion\(message\)\)/);
  assert.match(route, /if \(isServiceInformationQuestion\(message\)\)/);
  assert.ok(route.indexOf("if (isPolicyQuestion(message))") < route.indexOf("const apiBaseUrl"));
  assert.ok(route.indexOf("if (isServiceInformationQuestion(message))") < route.indexOf("const apiBaseUrl"));
});
