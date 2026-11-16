import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const actions = read("../app/(dashboard)/documents/sora-sources/actions.ts");
const page = read("../app/(dashboard)/documents/sora-sources/page.tsx");
const navigation = read("../lib/navigation.ts");

test("Ate Sora official sources and service requirements live inside Documents & Services", () => {
  assert.match(navigation, /title: "Ate Sora Sources", href: "\/documents\/sora-sources", module: "documents"/);
  assert.match(navigation, /title: "Knowledge Uploads", href: "\/knowledge", module: "documents"/);
  assert.match(page, /Documents &amp; Services/);
  assert.match(page, /\/documents\/policies/);
  assert.match(page, /import the document as Draft/i);
  assert.match(page, /Document services/);
});

test("no direct client admin writes or service role secrets", () => {
  assert.doesNotMatch(page, /SUPABASE_SERVICE_ROLE_KEY|createAdminClient|\.from\("verified_legal_sources"\)\.insert/);
  assert.match(actions, /^"use server"/);
  assert.match(actions, /checkUserPermission\(user.id, "documents", action\)/);
  assert.match(actions, /createAdminClient\(\)/);
  assert.match(actions, /verifiedGovernmentUrl/);
  assert.match(actions, /gov\\\.ph/);
});

test("source edits unpublish until a distinct authenticated approval", () => {
  assert.match(actions, /status: "Archived"/);
  assert.match(actions, /authorize\("canApprove"\)/);
  assert.match(actions, /confirmedReviewed !== true/);
  assert.match(actions, /REVIEW/i);
  assert.match(page, /Publish after review/);
  assert.match(page, /original official source/);
});

test("service editor only changes approved description and requirements fields", () => {
  assert.match(actions, /authorize\("canEdit"\)/);
  assert.match(actions, /from\("document_types"\)/);
  assert.match(actions, /requirements_json: clean/);
  assert.match(page, /one per line/);
  assert.doesNotMatch(actions, /createClient\(.+SUPABASE_SERVICE_ROLE_KEY/s);
});
