import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../../supabase/migrations/20261024000001_document_requirement_cleanup_rls.sql", import.meta.url), "utf8");
test("document cleanup policy restricts DELETE to authenticated path owner", () => {
  assert.match(migration, /FOR DELETE TO authenticated/i);
  assert.match(migration, /bucket_id = 'document-requirements'/);
  assert.match(migration, /storage\.foldername\(name\)/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.doesNotMatch(migration, /TO anon\b/i);
});
