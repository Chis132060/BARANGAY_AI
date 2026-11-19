import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const component = read("../components/chat/InChatFormCard.tsx");
const chat = read("../components/chat/ChatInterface.tsx");

test("Ate Sora form stays compact and inline at every viewport width", () => {
  assert.match(component, /className="w-full min-w-0 overflow-hidden rounded-2xl border/);
  assert.match(component, /Keep the form in Ate Sora's one chat scroll area/);
  assert.match(component, /space-y-4 p-3 sm:p-4/);
  assert.match(component, /min-h-24 w-full resize-y/);
  assert.doesNotMatch(component, /Make form bigger|setExpanded|aria-modal|fixed inset-0 z-\[100\]|h-\[100dvh\]/);
  assert.doesNotMatch(component, /overflow-y-auto/);
  assert.match(chat, /ref=\{messagesScrollRef\} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto/);
  assert.match(chat, /max-w-\[calc\(100%-2\.5rem\)\]/);
});

test("known document requests open the real form automatically inside chat", () => {
  assert.match(chat, /if \(userFormRequest\.formType && isDocumentFormId\(userFormRequest\.formType\)\)/);
  assert.match(chat, /formType: userFormRequest\.formType/);
  assert.match(chat, /<InChatFormCard formType=\{m\.formType\}/);
  assert.match(chat, /const top = card\.getBoundingClientRect\(\)\.top/);
  assert.match(component, /from\("document_types"\)/);
});

test("confirmed submission removes active form, restores chat and shows a tracking receipt", () => {
  assert.match(component, /const result = await submitDocumentRequest\(payload\)/);
  assert.match(component, /if \(!result\?\.success \|\| !result\.reference\) throw/);
  assert.match(component, /onSubmitted\?\.\(result\.reference\)/);
  assert.match(chat, /onSubmitted=\{reference => handleFormSubmitted\(m\.id, reference\)\}/);
  assert.match(chat, /formType: undefined, formTitle: undefined, formSchema: undefined/);
  assert.match(chat, /isReceipt: true/);
  assert.match(chat, /role=\{m\.isReceipt \? "status" : undefined\}/);
  assert.match(chat, /href="\/requests"/);
  assert.match(chat, /viewport\.scrollTo\(\{ top: viewport\.scrollHeight, behavior: "smooth" \}\)/);
  assert.doesNotMatch(chat, /window\.location\.href\s*=\s*"\/requests"/);
});

test("uploads, saved ID and idempotent server submission are unchanged", () => {
  assert.match(component, /Use my registered ID/);
  assert.match(component, /Use my registered barangay address/);
  assert.match(component, /payload\.set\("clientOperationId", operationId\.current\)/);
  assert.match(component, /submitDocumentRequest\(payload\)/);
  assert.match(component, /min-h-14 w-full/);
  assert.match(component, /no payment is collected/i);
});
