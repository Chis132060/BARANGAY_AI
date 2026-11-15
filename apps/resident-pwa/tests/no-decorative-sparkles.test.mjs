import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("resident portal call-to-action icons do not show decorative stars or twinkles", () => {
  const home = read("../app/(app)/home/page.tsx");
  const requests = read("../app/(app)/requests/page.tsx");
  assert.match(home, /<Bot className="h-3 w-3 text-amber-300"/);
  assert.match(requests, /<Bot className="h-3\.5 w-3\.5"/);
  assert.doesNotMatch(home + requests, /\b(?:Star|Stars|Sparkles|Sparkle)\b|[★☆✦✧✨🌟⭐]/);
});
