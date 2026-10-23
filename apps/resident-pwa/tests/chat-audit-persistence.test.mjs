import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/api/chat/route.ts", import.meta.url), "utf8");
test("policy fallback reports audit result rather than unconditional success", () => {
 const branch = source.slice(source.indexOf("const dbPolicies = await fetchMatchingPolicies"),source.indexOf("const localFallbackGreetings"));
 assert.match(branch, /const auditRecorded = await writeFallbackAudit\(/);
 assert.match(branch, /context_used: true, auditRecorded/);
 assert.doesNotMatch(branch, /auditRecorded: true/);
});
