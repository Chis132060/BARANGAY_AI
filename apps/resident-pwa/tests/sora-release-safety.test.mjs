import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const chatRoute = readFileSync(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
const voiceRoute = readFileSync(new URL("../app/api/realtime/session/route.ts", import.meta.url), "utf8");
const pwaConfig = readFileSync(new URL("../next.config.js", import.meta.url), "utf8");

test("unaudited local knowledge is not used as official chat fallback", () => {
  assert.doesNotMatch(chatRoute, /findMatchingKnowledge\s*\(/);
  assert.doesNotMatch(chatRoute, /match\.reply/);
  assert.match(chatRoute, /citations:\s*\[\],\s*context_used:\s*false/);
});

test("active policy fallback enforces effective and expiry dates", () => {
  assert.match(chatRoute, /\.eq\('status', 'Active'\)/);
  assert.match(chatRoute, /effective_date\.lte/);
  assert.match(chatRoute, /expiry_date\.gte/);
});

test("realtime provider sessions remain disabled without server approval", () => {
  assert.match(voiceRoute, /SORA_REALTIME_SERVER_ENABLED\s*!==\s*"true"/);
  assert.match(voiceRoute, /status:\s*503/);
});

test("offline document fallback is explicit without caching private navigations", () => {
  assert.match(pwaConfig, /handler:\s*"NetworkOnly"/);
  assert.match(pwaConfig, /precacheFallback:\s*\{\s*fallbackURL:\s*"\/~offline"/);
});
