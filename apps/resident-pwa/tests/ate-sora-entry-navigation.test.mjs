import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");

const home=read("../app/(app)/home/page.tsx");
const requests=read("../app/(app)/requests/page.tsx");
const directory=read("../components/chat/ServiceDirectory.tsx");
const chat=read("../components/chat/ChatInterface.tsx");

test("main resident document entry points open Ate Sora instead of a separate request page",()=>{
  assert.match(home,/href: "\/chat\?services=1"/);
  for(const key of ["clearance","indigency","business"]){
    assert.ok(home.includes(`/chat?document=${key}`));
  }
  assert.match(requests,/href="\/chat\?services=1"/);
  assert.doesNotMatch(home,/href: "\/requests\/new/);
});

test("catalog service directory starts forms in the open chat and preserves tracking links",()=>{
  assert.match(directory,/onAsk\(`I want to request \$\{doc.name\}`\)/);
  assert.doesNotMatch(directory,/href=\{`\/requests\/new\?/);
  assert.match(directory,/href: "\/requests"/);
  assert.match(directory,/href: "\/support"/);
});

test("deep-linked service shortcuts wait for authentication and open in-chat form",()=>{
  assert.match(chat,/const \[authChecked, setAuthChecked\] = useState\(false\)/);
  assert.match(chat,/setIsLoggedIn\(!!user\);\s*setAuthChecked\(true\)/);
  assert.match(chat,/new URLSearchParams\(window.location.search\)/);
  assert.match(chat,/isDocumentFormId\(document\)/);
  assert.match(chat,/formType: document, formTitle/);
  assert.match(chat,/params.get\("services"\) === "1"/);
  assert.match(chat,/setServiceDirectoryOpen\(true\)/);
  assert.match(chat,/guestActionTrigger: true/);
});
