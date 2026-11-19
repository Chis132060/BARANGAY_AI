import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const topBar = read("../components/layout/TopBar.tsx");
const nav = read("../components/layout/BottomNav.tsx");
const updates = read("../app/(app)/announcements/page.tsx");
const directory = read("../components/chat/ServiceDirectory.tsx");
const chat = read("../components/chat/ChatInterface.tsx");
const chatForm = read("../components/chat/InChatFormCard.tsx");
const fullForm = read("../app/(app)/requests/new/page.tsx");
const shell = read("../app/(app)/layout.tsx");

const source = read("../lib/navigation/nav-badges.ts");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
assert.equal(compiled.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
const storage = new Map();
const events = [];
const cjs = { exports: {} };
const mockWindow = {
  localStorage: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  },
  dispatchEvent: event => events.push(event.type),
};
vm.runInNewContext(compiled.outputText, {
  exports: cjs.exports, module: cjs, window: mockWindow,
  Event: class { constructor(type) { this.type = type; } },
});
const { countActiveRequests, countUnseenAnnouncements, readSeenAnnouncements, markAnnouncementsSeen, NAV_BADGES_CHANGED } = cjs.exports;

test("Requests badges count actual active requests but exclude completed or rejected", () => {
  assert.equal(countActiveRequests(["Pending", "For Review", "Approved", "Ready for Pickup", "Released", "Completed", "Rejected", "Cancelled"]), 4);
  assert.equal(countActiveRequests(["Released", "Closed", null, ""]), 0);
  assert.equal(countActiveRequests(["Pending"]), 1);
});

test("Updates badge represents unseen published IDs, scoped separately by resident account", () => {
  const a = "11111111-1111-4111-8111-111111111111";
  const b = "22222222-2222-4222-8222-222222222222";
  const ids = [a, b];
  assert.equal(countUnseenAnnouncements(ids, readSeenAnnouncements("resident-A")), 2);
  markAnnouncementsSeen("resident-A", [a]);
  assert.equal(countUnseenAnnouncements(ids, readSeenAnnouncements("resident-A")), 1);
  assert.equal(countUnseenAnnouncements(ids, readSeenAnnouncements("resident-B")), 2);
  assert.ok(events.includes(NAV_BADGES_CHANGED));
});

test("header shows live browser connectivity but never duplicates notification bell", () => {
  assert.match(topBar, /navigator\.onLine/);
  assert.match(topBar, /addEventListener\("offline"/);
  assert.match(topBar, /"Online" : "Offline"/);
  assert.doesNotMatch(topBar, /<Bell\b/);
  assert.doesNotMatch(topBar, /unread/);
});

test("bottom navigation badges use authenticated owner-scoped queries", () => {
  assert.match(nav, /from\("residents"\)/);
  assert.match(nav, /eq\("user_id", userId\)/);
  assert.match(nav, /from\("document_requests"\)/);
  assert.match(nav, /eq\("resident_id", resident\.data\.id\)/);
  assert.match(nav, /from\("announcements"\)/);
  assert.match(nav, /eq\("status", "Published"\)/);
  assert.match(nav, /"9\+" : count/);
  assert.match(nav, /aria-label=\{count \?/);
  assert.doesNotMatch(nav, /from\("notifications"\)/); // no duplicate bell/notification counter
});

test("updates are marked seen when viewing the actual Announcements tab", () => {
  assert.match(updates, /activeTab !== "announcements"/);
  assert.match(updates, /markAnnouncementsSeen\(session\.user\.id, announcements\.map\(item => item\.id\)\)/);
  assert.match(updates, /useState<"programs" \| "organizations" \| "announcements">\("announcements"\)/); // Updates opens on announcements
});

test("all services directory includes live catalog, search, and existing routed services", () => {
  assert.match(directory, /from\("document_types"\)/);
  assert.match(directory, /type="search"/);
  assert.match(directory, /onAsk\(`I want to request \$\{doc.name\}`\)/);
  for (const href of ["/requests", "/support", "/announcements?tab=programs", "/announcements?tab=organizations"]) {
    assert.ok(directory.includes(href), href);
  }
  assert.match(chat, /<ServiceDirectory open=\{serviceDirectoryOpen\}/);
  assert.match(chat, /View all barangay services/);
  assert.doesNotMatch(directory, /href: "\/appointments\/new"/);
});

test("in-chat application has accessible upload cards and real submission confirmations", () => {
  assert.match(chatForm, /submitDocumentRequest\(payload\)/);
  assert.match(chatForm, /type="file" required accept=/);
  assert.match(chatForm, /className="sr-only"/);
  assert.match(chatForm, /selected\.size > 5 \* 1024 \* 1024/);
  assert.match(chatForm, /No payment is collected in this form/);
  assert.match(chatForm, /setSubmitted\(true\)/);
  assert.match(chatForm, /window\.dispatchEvent\(new Event\(NAV_BADGES_CHANGED\)\)/);
  assert.match(chatForm, /onSubmitted\?\.\(result\.reference\)/);
  assert.doesNotMatch(chatForm, /Make form bigger|setExpanded|aria-modal/);
  assert.doesNotMatch(chatForm, /Open full-page form/);
  assert.doesNotMatch(chatForm, /href="\/appointments\/new"/);
});

test("all catalog services are selectable by validated ID, not only four shortcuts", () => {
  assert.match(fullForm, /types\.find\(doc => doc\.id === documentId\)/);
  assert.match(fullForm, /cached\.data\.find\(doc => doc\.id === documentId\)/);
  assert.doesNotMatch(fullForm, /href="\/appointments\/new"/);
});

test("chat fits its app-shell viewport and input remains above bottom nav", () => {
  assert.match(shell, /mx-auto flex h-\[100dvh\] min-h-0 w-full max-w-md flex-col overflow-hidden/);
  assert.match(shell, /resident-screen min-h-0 min-w-0 flex-1/);
  assert.doesNotMatch(shell, /paddingBottom: "var\(--bottom-nav-height\)"/);
  assert.match(nav, /data-mobile-nav-bar="true"/);
  assert.match(nav, /grid h-\[66px\] w-full max-w-md grid-cols-5/);
  assert.match(nav, /env\(safe-area-inset-bottom, 0px\)/);
  assert.match(chat, /flex h-full min-h-0 max-w-lg/);
  assert.match(read("../app/(app)/chat/page.tsx"), /h-full min-h-0 w-full/);
});

test("mobile viewport supports iOS zoom, safe area and nonoverlaying navigation", () => {
  const root = read("../app/layout.tsx");
  const css = read("../app/globals.css");
  const requestPage = read("../app/(app)/requests/page.tsx");
  const profile = read("../app/(app)/profile/page.tsx");
  const register = read("../app/(auth)/register/page.tsx");
  assert.match(root, /viewportFit: "cover"/);
  assert.doesNotMatch(root, /userScalable: false/);
  assert.match(css, /--bottom-nav-height: calc\(66px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  assert.doesNotMatch(css, /body \{\s*padding-bottom: env\(safe-area-inset-bottom\)/);
  assert.match(requestPage, /mobile-sheet/);
  assert.match(requestPage, /break-all font-mono/);
  assert.match(profile, /mobile-sheet/);
  assert.match(register, /min-h-\[100dvh\]/);
  assert.match(directory, /text-base text-slate-900 outline-none/);
});

test("classic labeled navigation is clean, responsive, accessible, and safe-area aware", () => {
  const nav = read("../components/layout/BottomNav.tsx");
  const shell = read("../app/(app)/layout.tsx");
  for (const path of ["/home", "/requests", "/announcements", "/chat", "/profile"]) {
    assert.ok(nav.includes('path: "' + path + '"'), path + " route must remain unchanged");
  }
  for (const label of ["Home", "Requests", "Updates", "Ate Sora", "Profile"]) {
    assert.ok(nav.includes('label: "' + label + '"'), label + " label should be shown");
  }
  assert.match(nav, /data-mobile-nav-bar="true"/);
  assert.match(nav, /grid h-\[66px\] w-full max-w-md grid-cols-5/);
  assert.match(nav, /border-t border-slate-200 bg-white/);
  assert.ok(nav.includes('w-full truncate text-[10px]'));
  assert.match(nav, /<Icon className="h-\[22px\] w-\[22px\]"/);
  assert.match(nav, /active \? "bg-blue-50" : "bg-transparent/);
  assert.match(nav, /pathname === path \|\| pathname\.startsWith\(path \+ "\/"\)/);
  assert.match(nav, /\[@media\(hover:hover\)\]:hover:text-blue-700/);
  assert.doesNotMatch(nav, /rounded-full border border-slate-200 bg-white/);
  assert.doesNotMatch(nav, /bg-\[#e5f1ff\]/);
  assert.match(nav, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(nav, /aria-label=\{count \?/);
  assert.match(nav, /count > 9 \? "9\+" : count/);
  assert.match(nav, /env\(safe-area-inset-bottom, 0px\)/);
  assert.match(nav, /env\(safe-area-inset-left, 0px\)/);
  assert.match(nav, /env\(safe-area-inset-right, 0px\)/);
  assert.doesNotMatch(nav, /className="fixed bottom-0/);
  assert.match(shell, /<BottomNav \/>/);
  assert.doesNotMatch(shell, /paddingBottom: "var\(--bottom-nav-height\)"/);
});

test("registration fits compact 320px phones without stretching four-step indicator", () => {
  const form = read("../components/auth/RegisterForm.tsx");
  assert.match(form, /grid min-w-0 grid-cols-4 gap-1 border-b/);
  assert.match(form, /grid min-w-0 grid-cols-1 gap-2 min-\[375px\]:grid-cols-2/);
  assert.match(form, /min-w-0 flex-col items-center justify-start gap-1 break-words/);
  assert.match(form, /4\. ID/);
  assert.doesNotMatch(form, /4\. ID Verification/);
});
