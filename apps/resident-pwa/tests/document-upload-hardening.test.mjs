import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../app/(app)/requests/actions.ts", import.meta.url), "utf8");

test("document submission checks PDF/PNG/JPEG signatures before upload", () => {
  assert.match(source, /validateFileSignature\(file\)/);
  assert.match(source, /0x25, 0x50, 0x44, 0x46, 0x2d/);
  assert.match(source, /137, 80, 78, 71, 13, 10, 26, 10/);
  assert.match(source, /0xff, 0xd8, 0xff/);
});
test("document submission removes successful uploads when a later operation fails", () => {
  assert.match(source, /uploadedPaths\.push\(filePath\)/);
  assert.match(source, /\.remove\(uploadedPaths\)/);
  assert.match(source, /throw error;/);
});
test("document submission assigns unpredictable object names", () => {
  assert.match(source, /crypto\.randomUUID\(\)/);
});

test("rejects duplicate attachment keys and excludes user filenames from stored paths", () => {
  assert.match(source, /new Set\(parsed\)\.size !== parsed\.length/);
  assert.match(source, /req_\$\{timestamp\}\.\$\{ext\}/);
  assert.doesNotMatch(source, /req_\$\{timestamp\}_\$\{file\.name/);
});
