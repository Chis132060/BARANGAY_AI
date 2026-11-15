import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(p, import.meta.url), "utf8");
const sql = read("../../../supabase/migrations/20261115192000_policy_source_scope_and_activation_guard.sql");
const page = read("../app/(dashboard)/documents/policies/page.tsx");
const knowledge = read("../app/(dashboard)/knowledge/page.tsx");
const adminQueue = read("../app/(dashboard)/documents/requests/components/RequestsTable.tsx");
const receipt = read("../lib/request-receipt.ts");

test("policy upload is draft until signed and locality verified", () => {
  assert.match(page, /async function parseFile\(file: File\)/);
  assert.match(page, /status:\s*"Draft"/);
});
test("active policies require source and Butuan-specific scope", () => {
  assert.match(sql, /policy_active_source_guard/);
  assert.match(sql, /jurisdiction_scope IN \('tandang_sora_butuan', 'butuan_city'\)/);
  assert.match(sql, /status <> 'Active'/);
  assert.match(page, /reviewedOfficialSource/);
  assert.match(page, /source_reference/);
  assert.match(page, /Barangay Tandang Sora \(Poblacion\), Butuan City/);
  assert.match(page, /status:\s*"Draft"/);
  assert.match(knowledge, /status: "draft"/);
  assert.match(knowledge, /verify the original source and jurisdiction/i);
});
test("staff and resident show the same UUID-backed reference format", () => {
  assert.match(adminQueue, /formatRequestReference\(req\.id\)/);
  assert.match(receipt, /TS12-/);
  assert.doesNotMatch(receipt, /Math\.random/);
});
