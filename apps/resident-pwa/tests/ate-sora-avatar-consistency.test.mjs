import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = p => readFileSync(path.join(dir, p), "utf8");

test("public Ate Sora portrait is bundled and matches chat's existing avatar", () => {
  const chat = read("../components/chat/ChatInterface.tsx");
  assert.ok(existsSync(path.join(dir, "../public/ate-sora.jpg")),
    "Do not substitute a missing avatar image");
  assert.match(chat, /const SORA_AVATAR = "\/ate-sora\.jpg"/);
});

test("Home replaces both robot symbols with the actual Ate Sora portrait", () => {
  const home = read("../app/(app)/home/page.tsx");
  assert.match(home, /label: "Ask Ate Sora".*icon: null/);
  assert.match(home, /\{Icon \? \(/);
  assert.match(home, /src="\/ate-sora\.jpg"/);
  assert.match(home, /alt="Ate Sora"/);
  assert.match(home, /object-cover object-top/);
  assert.doesNotMatch(home, /\bBot\b|<Bot\b/);
  assert.match(home, /href: "\/chat"/);
  assert.match(home, /href: "\/requests"/);
});

test("Requests' Ask Ate Sora link uses the portrait but keeps navigation", () => {
  const requests = read("../app/(app)/requests/page.tsx");
  assert.match(requests, /href="\/chat"/);
  assert.match(requests, /src="\/ate-sora\.jpg"/);
  assert.match(requests, /Ask Ate Sora/);
  assert.doesNotMatch(requests, /\bBot\b|<Bot\b/);
});

test("other quick actions keep their own icons and visible labels", () => {
  const home = read("../app/(app)/home/page.tsx");
  for (const icon of ["FileText", "ClipboardList", "Megaphone"]) {
    assert.ok(home.includes("icon: " + icon), "Expected other action icon " + icon);
  }
  assert.match(home, /<Icon className="h-5 w-5" aria-hidden="true" \/>/);
  assert.match(home, /Get help with barangay services/);
});
