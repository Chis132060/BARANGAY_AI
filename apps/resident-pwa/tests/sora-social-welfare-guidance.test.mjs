import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const source = read("../lib/ai/resident-concern-grounding.ts");
const policySource = read("../lib/ai/verified-policy-grounding.ts");
const route = read("../app/api/chat/route.ts");
const adminActions = read("../../admin-portal/app/(dashboard)/documents/sora-sources/actions.ts");
const adminPage = read("../../admin-portal/app/(dashboard)/documents/sora-sources/page.tsx");
const migration = read("../../../supabase/migrations/20261116105807_classify_social_welfare_references_separate_from_barangay_ordinances.sql");

const exports = {};
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
vm.runInNewContext(compiled.outputText, { exports, URL, console, Date });
const { getVerifiedResidentConcernAnswer, isWelfareSupportQuestion, getOfflineConversationReply } = exports;

const aics = {
  title: "DSWD Caraga AICS — Food, crisis cash and material assistance",
  source_url: "https://caraga.dswd.gov.ph/programs-and-projects/assistance-to-individuals-in-crisis-situation-aics/",
  jurisdiction_scope: "philippines",
  authority: "government_program",
  summary: "Kung walang makain, unang lumapit sa Barangay Tandang Sora Hall. Magtanong tungkol sa urgent assessment at referral sa Butuan CSWDD. Maaari ring pumunta sa DSWD Caraga Crisis Intervention Section sa R. Palma Street, Barangay Dagohoy, Butuan City. Dalhin ang ID kung mayroon. Assistance depends on social worker assessment, and there is no guaranteed amount or release date.",
  keywords: ["walang makain", "walang pera", "walang wala", "gutom", "pagkain", "financial assistance", "food assistance", "pambili ng pagkain", "ayuda"],
  status: "Published", verified_at: "2026-11-16T10:58:07+08:00",
};
const fourPs = {
  ...aics, title: "RA 11310 — Pantawid Pamilyang Pilipino Program",
  authority: "national_law",
  source_url: "https://pantawid.dswd.gov.ph/about/",
  keywords: ["ayuda", "4ps", "pantawid"],
  summary: "The 4Ps national program has social worker and household eligibility assessment. This program is not a same-day entitlement to food aid.",
};
const city = {
  ...aics, title: "Butuan CSWDD — Social welfare assessments and referral for Tandang Sora residents",
  authority: "city_service", jurisdiction_scope: "butuan_city",
  source_url: "https://www.butuan.gov.ph/city-social-welfare-and-development-office/",
  keywords: ["butuan city", "welfare referral", "cswdd"],
};
function mockDb(rows) {
  return {
    visited: [],
    from(table) {
      this.visited.push(table);
      assert.equal(table, "verified_legal_sources");
      const q = { select() { return q; }, eq() { return q; }, not() { return q; }, limit() { return Promise.resolve({ data: rows, error: null }); } };
      return q;
    },
  };
}

test("recognizes everyday Tagalog, English and Cebuano hunger and cash crises", () => {
  for (const text of ["wala kaming makain", "walang-wala kami",
    "gutom ang mga anak ko", "paano kumuha ng food assistance",
    "kailangan ko ng tulong pinansyal", "my family has no food",
    "mangayo og tabang kay walay pagkaon", "wala akong pambili ng gatas"]) {
    assert.equal(isWelfareSupportQuestion(text), true, text);
  }
  assert.equal(isWelfareSupportQuestion("ano requirements ng Certificate of Indigency"), false);
  assert.equal(isWelfareSupportQuestion("hello ate sora"), false);
});

test("routes resident hunger to AICS rather than 4Ps law or a document form", async () => {
  const db = mockDb([fourPs, city, aics]);
  const r = await getVerifiedResidentConcernAnswer(db, "wala kaming makain at walang pera", "tgl");
  assert.ok(r);
  assert.match(r.answer, /Barangay Tandang Sora Hall/);
  assert.match(r.answer, /Butuan CSWDD/);
  assert.match(r.answer, /DSWD Caraga Crisis Intervention Section/);
  assert.match(r.answer, /May makakain pa ba kayo ngayong araw/);
  assert.match(r.citations[0], /Official government assistance program/);
  assert.doesNotMatch(r.answer, /4Ps national program/);
  assert.deepEqual([...db.visited], ["verified_legal_sources"]);
});

test("natural hunger statement without exact keyword phrase still finds the official AICS office", async () => {
  const r = await getVerifiedResidentConcernAnswer(mockDb([fourPs, city, aics]), "wala kaming makain", "tgl");
  assert.ok(r, "free-form story should match reviewer-controlled keyword terms");
  assert.match(r.answer, /DSWD Caraga Crisis Intervention Section/);
  assert.match(r.citations[0], /Official government assistance program/);
});

test("English food assistance answer asks food-specific followup instead of police report", async () => {
  const r = await getVerifiedResidentConcernAnswer(mockDb([aics]), "I need financial assistance and food", "en");
  assert.ok(r);
  assert.match(r.answer, /Does your family have anything to eat today/);
  assert.doesNotMatch(r.answer, /have you reported it yet/);
});

test("an approved Butuan city service is correctly scoped and can also answer welfare referrals", async () => {
  const r = await getVerifiedResidentConcernAnswer(mockDb([city]), "saan ang butuan cswdd?", "tgl");
  assert.ok(r);
  assert.match(r.citations[0], /Butuan City public social service/);
  assert.doesNotMatch(r.citations[0], /Published barangay policy/);
});

test("do not promote archived, wrong-scope or lookalike sources to resident answers", async () => {
  const rows = [
    { ...aics, status: "Archived" },
    { ...aics, jurisdiction_scope: "butuan_city" },
    { ...aics, source_url: "https://caraga.dswd.gov.ph.evil.test" },
  ];
  assert.equal(await getVerifiedResidentConcernAnswer(mockDb(rows), "walang makain", "tgl"), null);
});

test("offline assistance is still useful and avoids invented cash amounts", () => {
  const txt = getOfflineConversationReply("wala kaming makain", "tgl");
  assert.match(txt, /Barangay Tandang Sora Hall/);
  assert.match(txt, /CSWDD/);
  assert.match(txt, /DSWD Caraga/);
  assert.match(txt, /May makakain pa ba kayo ngayong araw/);
  assert.doesNotMatch(txt, /garantisadong PHP|magkakaroon ng food pack/i);
});

test("food crisis is checked before static document-service FAQ", () => {
  const early = route.indexOf("if (isWelfareSupportQuestion(message))");
  assert.ok(early > 0);
  assert.ok(early < route.indexOf("const faq = matchServiceFaq(message)"));
  assert.ok(early < route.indexOf("if (isPolicyQuestion(message))"));
  assert.match(route, /answer_source: "published_social_welfare_guidance"/);
  assert.doesNotMatch(source, /\.from\("knowledge_chunks"\)/);
});

test("review workflow, official program classification, and PDFs stay separated from ordinances", () => {
  assert.match(migration, /'government_program'/);
  assert.match(migration, /'city_service'/);
  assert.match(policySource, /government_program/);
  assert.match(policySource, /city_service/);
  assert.match(adminActions, /government_program/);
  assert.match(adminActions, /city_service/);
  assert.match(adminPage, /DSWD \/ national assistance program/);
  assert.match(adminPage, /NOT barangay-issued ordinances/i);
  assert.match(adminPage, /kind=catalog/);
  assert.match(adminPage, /signed PDF/);
});
