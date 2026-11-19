import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const chat = read("../components/chat/ChatInterface.tsx");
const inlineForm = read("../components/chat/InChatFormCard.tsx");
const chatPage = read("../app/(app)/chat/page.tsx");
const appShell = read("../app/(app)/layout.tsx");
const errorBoundary = read("../app/(app)/chat/error.tsx");

test("known document requests open the catalog-backed in-chat form without relying on an AI reply", () => {
  const direct = chat.indexOf("if (userFormRequest.formType && isDocumentFormId(userFormRequest.formType))");
  const apiRequest = chat.indexOf('fetch("/api/chat"');
  assert.ok(direct > 0 && apiRequest > direct, "recognize the intent before calling the AI API");
  const segment = chat.slice(direct, apiRequest);
  assert.match(segment, /setMessages\(\(prev\) => \[\.\.\.prev, \{/);
  assert.match(segment, /formType: userFormRequest\.formType/);
  assert.match(segment, /formTitle,/);
  assert.match(segment, /voiceRequestInFlightRef\.current = false;\s*return;/);
  assert.match(chat, /<InChatFormCard formType=\{m\.formType\}/);
  assert.match(inlineForm, /\.from\("document_types"\)/);
  assert.match(inlineForm, /\.select\("id,name,description,requirements_json"\)/);
  assert.match(inlineForm, /submitDocumentRequest\(payload\)/);
  assert.doesNotMatch(segment, /data\.formSchema|agentResponse/);
});

test("in-chat form is scrolled to its header and never scrolls the entire page", () => {
  assert.match(chat, /const messagesScrollRef = useRef<HTMLDivElement>\(null\)/);
  assert.match(chat, /ref=\{messagesScrollRef\} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto/);
  assert.match(chat, /data-ate-sora-form-message=\{m\.formType/);
  assert.match(chat, /viewport\.querySelectorAll<HTMLElement>\("\[data-ate-sora-form-message\]"\)/);
  assert.match(chat, /viewport\.scrollTo\(\{ top: Math\.max\(0, top - 8\)/);
  assert.doesNotMatch(chat, /messagesEndRef\.current\?\.scrollIntoView/);
  assert.match(chatPage, /className="flex h-full min-h-0 w-full flex-col"/);
  assert.match(appShell, /isChat \? "flex flex-col overflow-hidden"/);
});

test("form errors present recovery paths instead of leaving an empty chat view", () => {
  assert.match(inlineForm, /role="alert"/);
  assert.match(inlineForm, /Retry catalog/);
  assert.match(inlineForm, /Keep the form in Ate Sora\x27s one chat scroll area/);
  assert.doesNotMatch(inlineForm, /Make form bigger|setExpanded|aria-modal/);
  assert.doesNotMatch(inlineForm, /Open full-page form/);
  assert.match(errorBoundary, /export default function ChatError/);
  assert.match(errorBoundary, /onClick=\{reset\}/);
  assert.match(errorBoundary, /href="\/requests\/new"/);
  assert.match(errorBoundary, /Your document request has not been submitted/);
});

test("guest requests require sign-in and never create document applications automatically", () => {
  assert.match(chat, /if \(userFormRequest\.guestActionTrigger\)/);
  assert.match(chat, /guestActionTrigger: true/);
  assert.match(chat, /Sign In to Submit Application Form/);
  assert.match(inlineForm, /No payment is collected in this form/);
});
