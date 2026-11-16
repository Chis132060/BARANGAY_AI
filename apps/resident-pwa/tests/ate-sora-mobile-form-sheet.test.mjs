import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync(
  new URL("../components/chat/InChatFormCard.tsx", import.meta.url), "utf8"
);

test("expanded Ate Sora form covers the entire viewport on phones, tablets and narrow desktop windows", () => {
  assert.match(component, /fixed inset-0 z-\[100\] flex h-\[100dvh\] w-screen min-w-0 flex-col overflow-hidden/);
  // The previous sm: breakpoint made an 846px desktop screenshot a floating card.
  // Do not reintroduce breakpoint-specific viewport gaps or a max-width on the sheet.
  assert.doesNotMatch(component, /sm:(?:top|bottom)-\[3dvh\]|sm:max-w-xl|sm:rounded-3xl|sm:h-auto/);
  assert.match(component, /mx-auto w-full max-w-2xl/);
  assert.doesNotMatch(component, /bottom-\[calc\(4\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
  assert.match(component, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.match(component, /safe-area-inset-top/);
  assert.match(component, /safe-area-inset-bottom/);
  assert.match(component, /min-h-28 w-full resize-y/);
});

test("back header remains outside the scrolling form and does not change the route", () => {
  const header = component.indexOf("Back to Ate Sora chat");
  const viewport = component.indexOf("ref={expanded ? expandedScrollRef");
  assert.ok(header > 0 && viewport > header, "back action is in fixed header");
  assert.match(component, /onClick=\{\(\) => setExpanded\(false\)\}/);
  assert.match(component, /Make form bigger/);
  assert.match(component, /setExpanded\(value => !value\)/);
  assert.match(component, /document\.body\.style\.overflow = "hidden"/);
  assert.match(component, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(component, /event\.key === "Escape"/);
  assert.doesNotMatch(component, /Open full-page form/);
});

test("keyboard and screen readers recognize the sheet as one accessible modal", () => {
  assert.match(component, /const expandedTitleId = useId\(\)/);
  assert.match(component, /role=\{expanded \? "dialog" : undefined\}/);
  assert.match(component, /aria-modal=\{expanded \? true : undefined\}/);
  assert.match(component, /aria-labelledby=\{expanded \? expandedTitleId : undefined\}/);
  assert.match(component, /if \(event\.key !== "Tab"\) return/);
  assert.match(component, /last\.focus\(\)/);
  assert.match(component, /first\.focus\(\)/);
  assert.match(component, /closeExpandedRef\.current\?\.focus\(\)/);
});

test("form retains wide touch targets and existing verified-ID server submission", () => {
  assert.match(component, /min-h-\[76px\] cursor-pointer/);
  assert.match(component, /min-h-14 w-full/);
  assert.match(component, /text-base font-bold text-slate-900/);
  assert.match(component, /Use my registered ID/);
  assert.match(component, /Use my registered barangay address/);
  assert.match(component, /submitDocumentRequest\(payload\)/);
  assert.match(component, /Automatically generated request reference/);
});
