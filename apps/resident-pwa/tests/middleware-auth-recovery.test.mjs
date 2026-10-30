import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const middleware = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");

test("stale missing-refresh-token sessions clear auth cookies without logging an expected failure", () => {
  const authCatch = middleware.split("} catch (err) {")[1].split("// API routes authenticate")[0];
  assert.match(authCatch, /refresh_token_not_found/);
  assert.match(authCatch, /request\.cookies\.delete\(cookie\.name\)/);
  assert.match(authCatch, /response\.cookies\.delete\(cookie\.name\)/);
  assert.match(authCatch, /else \{\s*console\.warn/);
});
