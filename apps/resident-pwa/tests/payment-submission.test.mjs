import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const action = read("../app/(app)/requests/payment-actions.ts");
const migration = read("../../../supabase/migrations/20261027000003_atomic_resident_payment_submission.sql");
const grants = read("../../../supabase/migrations/20261027000004_rpc_execute_grants_hardening.sql");

test("payment submission validates input and delegates to the atomic server-only RPC", () => {
  assert.match(action, /supabase\.auth\.getUser\(\)/);
  assert.match(action, /normalizedReference\.length < 3/);
  assert.match(action, /createAdminClient\(\)/);
  assert.match(action, /rpc\("submit_document_payment"/);
  assert.doesNotMatch(action, /\.from\("payments"\)\.insert/);
});

test("atomic payment RPC verifies ownership, serializes requests, and writes resident IDs", () => {
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /r\.user_id = p_user_id AND r\.verification_status = 'Verified'/);
  assert.match(migration, /v_request\.resident_id IS DISTINCT FROM v_resident_id/);
  assert.match(migration, /INSERT INTO public\.payments\(request_id, resident_id, amount, provider, reference_number, status\)/);
  assert.match(migration, /UPDATE public\.document_requests SET payment_status = 'Pending'/);
  assert.match(migration, /TO service_role/);
  assert.doesNotMatch(migration, /GRANT EXECUTE[^;]+TO authenticated/i);
});

test("payment table reads are limited to authenticated document reviewers", () => {
  assert.match(grants, /CREATE POLICY "Authorized staff can view payments"/);
  assert.match(grants, /FOR SELECT TO authenticated/);
  assert.match(grants, /has_module_permission\('documents', 'view'\)/);
  assert.doesNotMatch(grants, /FOR INSERT TO authenticated/);
});
