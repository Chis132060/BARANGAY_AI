import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const server = read("../app/(app)/requests/actions.ts");
const form = read("../app/(app)/requests/new/page.tsx");
const chatForm = read("../components/chat/InChatFormCard.tsx");
const history = read("../app/(app)/requests/page.tsx");
const assistantRoute = read("../app/api/chat/route.ts");
const policyGrounding = read("../lib/ai/verified-policy-grounding.ts");
const suggestions = read("../lib/ai/policy-knowledge.ts");
const reference = read("../lib/request-receipt.ts");

test("unique receipt is derived from complete database UUID and is not a payment reference", () => {
  assert.match(reference, /id\.replace\(\/-\/g, ""\)\.toUpperCase\(\)/);
  assert.match(reference, /TS12-/);
  assert.match(server, /\.insert\(\{[\s\S]*?\}\)\.select\("id"\)\.single\(\)/);
  assert.match(server, /reference: formatRequestReference\(createdId\)/);
  assert.match(server, /reference: formatRequestReference\(existing\.id\)/);
  assert.match(form, /setReceiptReference\(receipt\.reference\)/);
  assert.match(chatForm, /setReceiptReference\(result\.reference\)/);
  assert.match(history, /formatRequestReference\(req\.id\)/);
  assert.match(history, /formatRequestReference\(viewingRequest\.id\)/);
});

test("request action reuses only authenticated verified resident ID and server catalog ID requirement", () => {
  assert.match(server, /resident\.verification_status !== "Verified"/);
  assert.match(server, /select\("id, verification_status, id_type, id_photo_url"\)/);
  assert.match(server, /requirements\.includes\(value\) && isValidIdRequirement\(value\)/);
  assert.match(server, /hasRegistrationIdOnFile\(resident\)/);
  assert.match(server, /verified_registration_id_on_file/);
  assert.doesNotMatch(server, /\.download\(resident\.id_photo_url/);
  assert.match(server, /\.from\("document-requirements"\)/);
  assert.match(form, /Use my registered ID/);
  assert.match(form, /Upload a different\/current ID/);
  assert.match(chatForm, /Use my registered ID/);
  assert.match(chatForm, /reuseVerifiedIdRequirements/);
  assert.doesNotMatch(server, /formData\.get\("id_photo_url"\)/);
});

test("Ate Sora's policy questions are source-gated before any AI provider", () => {
  const routeGuard = assistantRoute.indexOf("if (isPolicyQuestion(message))");
  const agentStart = assistantRoute.indexOf("await runSoraAgent(");
  assert.ok(routeGuard > 0 && agentStart > routeGuard);
  assert.match(policyGrounding, /\.eq\("status", "Active"\)/);
  assert.match(policyGrounding, /\.in\("jurisdiction_scope", \["tandang_sora_butuan", "butuan_city"\]\)/);
  assert.match(policyGrounding, /source_reference/);
  assert.match(policyGrounding, /quezon\\s\+city/);
  assert.match(policyGrounding, /I cannot verify an approved current policy/);
  assert.match(assistantRoute, /model_used: "verified-policy-registry\/no-llm"/);
  assert.doesNotMatch(suggestions, /₱50|₱500|this saturday|processing time: 15|No Noon Break/i);
  assert.match(suggestions, /return null;/);
});
