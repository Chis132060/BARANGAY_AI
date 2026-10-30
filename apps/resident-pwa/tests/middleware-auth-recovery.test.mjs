import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const middleware = readFileSync(new URL("../middleware.ts", import.meta.url), "utf8");
const residentCookie = readFileSync(new URL("../lib/supabase/constants.ts", import.meta.url), "utf8");
const adminCookie = readFileSync(new URL("../../admin-portal/lib/supabase/constants.ts", import.meta.url), "utf8");
const residentClient = readFileSync(new URL("../lib/supabase/client.ts", import.meta.url), "utf8");
const residentServer = readFileSync(new URL("../lib/supabase/server.ts", import.meta.url), "utf8");
const adminClient = readFileSync(new URL("../../admin-portal/lib/supabase/client.ts", import.meta.url), "utf8");
const adminServer = readFileSync(new URL("../../admin-portal/lib/supabase/server.ts", import.meta.url), "utf8");

test("stale missing-refresh-token sessions clear auth cookies without logging an expected failure", () => {
  const authCatch = middleware.split("} catch (err) {")[1].split("// API routes authenticate")[0];
  assert.match(authCatch, /refresh_token_not_found/);
  assert.match(authCatch, /cookie\.name === AUTH_COOKIE_NAME/);
  assert.match(authCatch, /cookie\.name\.startsWith\(`\$\{AUTH_COOKIE_NAME\}\.\`\)/);
  assert.doesNotMatch(authCatch, /cookie\.name\.startsWith\("sb-"\)/);
  assert.match(authCatch, /request\.cookies\.delete\(cookie\.name\)/);
  assert.match(authCatch, /response\.cookies\.delete\(cookie\.name\)/);
  assert.match(authCatch, /else \{\s*console\.warn/);
});

test("middleware refresh preserves every chunked auth cookie across redirects", () => {
  assert.match(middleware, /const refreshedCookies = new Map/);
  assert.match(middleware, /for \(const \[name, cookie\] of refreshedCookies\) response\.cookies\.set/);
  assert.match(middleware, /for \(const cookie of response\.cookies\.getAll\(\)\) redirect\.cookies\.set\(cookie\)/);
});

test("Admin Portal and resident PWA persist auth in separate cookies", () => {
  const residentName = residentCookie.match(/AUTH_COOKIE_NAME = "([^"]+)"/)?.[1];
  const adminName = adminCookie.match(/AUTH_COOKIE_NAME = "([^"]+)"/)?.[1];
  assert.ok(residentName);
  assert.ok(adminName);
  assert.notEqual(residentName, adminName);
  for (const client of [residentClient, residentServer, adminClient, adminServer]) {
    assert.match(client, /cookieOptions: \{ name: AUTH_COOKIE_NAME \}/);
  }
  assert.match(middleware, /cookieOptions: \{ name: AUTH_COOKIE_NAME \}/);
});

test("a non-resident PWA session is never treated as a missing resident profile", () => {
  assert.doesNotMatch(middleware.match(/const PUBLIC_ROUTES = \[[^\]]+\]/)?.[0] ?? "", /pending-approval/);
  assert.match(middleware, /pathname === "\/pending-approval" \|\| pathname === "\/register" \|\| !isPublic/);
  assert.match(middleware, /if \(user && userRole === "Resident"\) \{/);
});
