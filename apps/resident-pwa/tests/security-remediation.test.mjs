import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("AI chat requires an authenticated user and bounds billable requests", () => {
  const router = read("../../api/routers/rag_router.py");
  const auth = read("../../api/core/auth.py");
  assert.match(router, /query: str = Field\(\.\.\., min_length=1, max_length=4000\)/);
  assert.match(router, /user = await require_chat_access\(authorization\)/);
  assert.match(auth, /CHAT_QUOTA_PER_MINUTE/);
  assert.match(auth, /Chat usage limit reached/);
});

test("PDF remote fetch rejects private DNS answers and redirects", () => {
  const source = read("../../../services/ai/pdf-processor/app/services/opendataloader.py");
  assert.match(source, /ipaddress\.ip_address\(item\[4\]\[0\]\)\.is_global/);
  assert.match(source, /follow_redirects=False/);
  assert.match(source, /Redirects are not allowed/);
});

test("database migration blocks resident-managed sensitive state changes", () => {
  const migration = read("../../../supabase/migrations/20261027000005_security_owner_field_guards.sql");
  for (const column of ["birth_date", "senior_status", "pwd_status", "four_ps_status", "verification_status", "fee_amount", "payment_status", "household_id", "NEW.status"]) {
    assert.ok(migration.includes(column), `Expected guard for ${column}`);
  }
  assert.match(migration, /BEFORE INSERT OR UPDATE ON public\.document_requests/);
  assert.match(migration, /v_authoritative_fee := CASE v_document_name/);
  assert.match(migration, /USING ERRCODE = '42501'/);
});

test("admin credential generation uses cryptographic randomness and escapes HTML", () => {
  const source = read("../../admin-portal/app/(dashboard)/residents/actions/createResidentWithCredentials.ts");
  assert.match(source, /crypto\.getRandomValues/);
  assert.match(source, /escapeHtml\(firstName\)/);
  assert.doesNotMatch(source, /Math\.random\(\)/);
});

