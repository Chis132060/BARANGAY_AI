import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("resident portal call-to-action icons do not show decorative stars or twinkles", () => {
  const home = read("../app/(app)/home/page.tsx");
  const requests = read("../app/(app)/requests/page.tsx");
  // The user requested Ate Sora's portrait in place of the robot symbols.
  assert.match(home, /src="\/ate-sora\.jpg"/);
  assert.match(requests, /src="\/ate-sora\.jpg"/);
  assert.doesNotMatch(home + requests, /\bBot\b|<Bot\b/);
  assert.doesNotMatch(home + requests, /\b(?:Star|Stars|Sparkles|Sparkle)\b|[★☆✦✧✨🌟⭐]/);
});
