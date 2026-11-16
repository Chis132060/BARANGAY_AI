import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const src = readFileSync(new URL("../lib/ai/resident-concern-grounding.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
const generated = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove },
});
const exports = {};
vm.runInNewContext(generated.outputText, { exports, URL, Date, console });
const { getVerifiedResidentConcernAnswer, getOfflineConversationReply } = exports;

function db(rows) {
  const visited = [];
  return {
    visited,
    from(table) {
      visited.push(table);
      assert.equal(table, "verified_legal_sources");
      const query = {
        select() { return query; },
        eq() { return query; },
        not() { return query; },
        limit() { return Promise.resolve({ data: rows, error: null }); },
      };
      return query;
    },
  };
}

const theft = {
  title: "Act No. 3815 - Theft (Article 308)",
  source_url: "https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/28/20426",
  jurisdiction_scope: "philippines",
  authority: "national_law",
  status: "Published",
  verified_at: "2026-11-16T06:15:00Z",
  keywords: ["ninakawan", "ninakaw", "nanakawan", "pagnanakaw", "stolen", "theft", "robbed"],
  summary: "Kung ninakawan ka, manatiling ligtas at huwag komprontahin ang pinaghihinalaan. Itabi ang ebidensiya. Mag-report sa police station para maitala ang insidente at kumuha ng reference.",
};

test("everyday Tagalog theft question returns real approved next steps instead of can't verify", async () => {
  const data = db([theft]);
  const result = await getVerifiedResidentConcernAnswer(data, "ninakawan ako tas alam ko sino yon anong dapat ko gawin", "tgl");
  assert.ok(result);
  assert.equal(result.context_used, true);
  assert.match(result.answer, /Mag-report sa police station/);
  assert.match(result.answer, /huwag komprontahin/);
  assert.match(result.answer, /Ligtas ka ba ngayon/);
  assert.ok(result.citations[0].includes("elibrary.judiciary.gov.ph"));
  assert.deepEqual([...data.visited], ["verified_legal_sources"]);
  assert.doesNotMatch(result.answer, /Hindi ko pa ma-verify ang opisyal/);
});

test("semantic everyday phrasing using staff-reviewed keywords also works in English", async () => {
  const result = await getVerifiedResidentConcernAnswer(db([theft]), "my phone was stolen what do I do?", "en");
  assert.ok(result);
  assert.match(result.answer, /I can help you work through this/);
  assert.match(result.answer, /Are you safe now/);
});

test("more than one resident issue can be recognized from database keywords", async () => {
  const child = {
    ...theft, title: "Children's protection law",
    summary: "For child protection concerns, seek help from the proper social welfare office and police. Save evidence and prioritize the child's safety.",
    keywords: ["child abuse", "child protection", "bullying", "bata", "pang-aabuso"],
  };
  const res = await getVerifiedResidentConcernAnswer(db([theft, child]), "my child is experiencing bullying", "en");
  assert.ok(res);
  assert.match(res.answer, /child protection concerns/i);
  assert.doesNotMatch(res.answer, /Mag-report sa police station/);
});

test("unknown, unverified, archived and lookalike official URLs are never cited as law", async () => {
  const bad = { ...theft, source_url: "https://elibrary.judiciary.gov.ph.evil.com/", keywords: ["ninakawan"] };
  const archived = { ...theft, status: "Archived" };
  const unknown = await getVerifiedResidentConcernAnswer(db([bad, archived]), "ninakawan ako", "tgl");
  assert.equal(unknown, null);
  const irrelevant = await getVerifiedResidentConcernAnswer(db([theft]), "hello, what is your name?", "en");
  assert.equal(irrelevant, null);
});

test("offline AI fallback remains useful, asks a question and does not invent laws", () => {
  const message = getOfflineConversationReply("ninakawan ako anong gagawin", "tgl");
  assert.match(message, /Itala ang nangyari/);
  assert.match(message, /Ligtas ka ba ngayon/);
  assert.doesNotMatch(message, /multa\s*PHP|RA\s*3815|arrestuhin/i);
  assert.doesNotMatch(message, /Hindi ko pa ma-verify ang opisyal at kasalukuyang impormasyon/);
});

test("chat route attempts published incident guide before paid AI backend", () => {
  assert.match(route, /getVerifiedResidentConcernAnswer\(supabase, message, language\)/);
  assert.match(route, /answer_source: "published_incident_guide"/);
  assert.match(route, /getOfflineConversationReply\(message, language\)/);
  assert.ok(route.indexOf("getVerifiedResidentConcernAnswer(supabase, message, language)") <
    route.indexOf("await runSoraAgent("));
  assert.doesNotMatch(src, /\.from\("knowledge_chunks"\)/);
  assert.doesNotMatch(src, /SUPABASE_SERVICE_ROLE_KEY/);
});
