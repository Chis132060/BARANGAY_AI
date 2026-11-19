import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.PWA_TEST_BASE_URL || "http://localhost:5173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: "allow" });
const page = await context.newPage();
try {
  // Reproduce the reported phone screenshot in the *guest* chat. A 100%-high
  // chat inside a min-height-only shell used to leave a large blank strip
  // under the composer. Test typing, click targets and layout before the
  // service-worker offline assertions.
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    serviceWorkers: "block",
  });
  try {
    const phone = await mobileContext.newPage();
    const chatResponse = await phone.goto(base + "/chat", {
      waitUntil: "domcontentloaded", timeout: 30000,
    });
    assert.equal(chatResponse?.status(), 200, "guest chat route must load on mobile");
    // Brand-new visitors must choose a language once. Complete that real UI
    // step before testing the composer; do not force-click through its modal.
    const languageDialog = phone.getByRole("dialog");
    await languageDialog.waitFor({ state: "visible", timeout: 15000 });
    await languageDialog.getByRole("button", { name: /Tagalog/ }).click();
    await languageDialog.waitFor({ state: "hidden", timeout: 15000 });
    const input = phone.getByRole("textbox", { name: "Ask Ate Sora a question" });
    const composer = phone.locator('[data-chat-composer="true"]');
    await input.waitFor({ state: "visible", timeout: 20000 });
    const fontSize = await input.evaluate(element => parseFloat(getComputedStyle(element).fontSize));
    assert.ok(fontSize >= 16, "mobile input text must be at least 16px to prevent iOS focus zoom");
    const initialBox = await composer.boundingBox();
    assert.ok(initialBox, "chat composer must have a measurable position");
    const initialGap = 844 - (initialBox.y + initialBox.height);
    assert.ok(initialGap >= -4 && initialGap <= 34,
      "guest mobile composer must stay anchored near viewport bottom (gap: " + initialGap + "px)");
    // 401 regression: an unauthenticated visitor must receive local guidance
    // for ordinary greetings without posting to the protected AI endpoint.
    const guestApiCalls = [];
    phone.on("request", request => {
      if (new URL(request.url()).pathname === "/api/chat")
        guestApiCalls.push(request.url());
    });
    await input.fill("hey");
    await phone.getByRole("button", { name: "Send message" }).click();
    await phone.getByText(/Maaari kang magtanong tungkol sa barangay services at mga dokumento/).waitFor({ timeout: 15000 });
    await phone.getByText(/Guest Quick Guide · no AI request sent/).waitFor({ timeout: 15000 });
    assert.equal(guestApiCalls.length, 0, "a guest greeting must not call the protected AI route");
    console.log("PASS: guest greeting returns local guidance without a 401 API request");

    const chatInputText = "Paano kumuha ng Certificate of Indigency?";
    await input.fill(chatInputText);
    await phone.waitForFunction(() => {
      const button = document.querySelector('button[aria-label="Send message"]');
      return button && !button.disabled;
    }, null, { timeout: 20000 });
    const send = phone.getByRole("button", { name: "Send message" });
    const sendBox = await send.boundingBox();
    assert.ok(sendBox && sendBox.width >= 44 && sendBox.height >= 44,
      "Send button must have a >=44px mobile touch target");
    await send.click();
    await phone.getByText(chatInputText, { exact: true }).waitFor({ timeout: 15000 });
    await phone.getByText(/Please sign in with your resident account to access the current application form/).waitFor({ timeout: 15000 });
    assert.equal(guestApiCalls.length, 0, "guest service navigation must not send requests to /api/chat");
    console.log("PASS: mobile guest composer stays bottom-aligned, accepts typing and submits a chat turn");
  } finally {
    await mobileContext.close();
  }

  // Registration regression: a weak or mismatched password must never
  // navigate from Step 3 to sensitive ID/selfie collection. Synthetic data
  // remains in this isolated browser; no registration is submitted.
  const signupContext = await browser.newContext({
    viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true,
    serviceWorkers: "block",
  });
  try {
    const signup = await signupContext.newPage();
    const response = await signup.goto(base + "/register", { waitUntil: "domcontentloaded", timeout: 30000 });
    assert.equal(response?.status(), 200, "registration page must load");
    await signup.getByPlaceholder("Juan").fill("Sample");
    await signup.getByPlaceholder("Dela Cruz").fill("Resident");
    await signup.locator('input[type="date"]').fill("1990-01-01");
    await signup.getByPlaceholder("09171234567").fill("09171234567");
    await signup.getByRole("button", { name: /Next: Residency Address/ }).click();
    await signup.getByPlaceholder("Rizal Street").fill("Test Street");
    await signup.getByRole("button", { name: /Next: Account Info/ }).click();
    await signup.getByPlaceholder("juan@example.com").fill("synthetic@example.invalid");
    const password = signup.locator("#registration-password");
    const confirm = signup.locator("#registration-confirm-password");
    const next = signup.getByRole("button", { name: /Next: ID & Selfie Verification/ });
    await password.fill("sixsix");
    await confirm.fill("sixsix");
    assert.equal(await next.isDisabled(), true, "six-character passwords must not proceed");
    await password.fill("LongExamplePassword-2026");
    await confirm.fill("WrongExamplePassword-2026");
    assert.equal(await next.isDisabled(), true, "mismatched confirmation must not proceed");
    await confirm.fill("LongExamplePassword-2026");
    assert.equal(await next.isEnabled(), true, "matching 12+ character passwords may proceed");
    await next.click();
    await signup.getByText("1. Capture your identification document").waitFor({ timeout: 10000 });
    assert.equal(await signup.getByRole("button", { name: /Submit Registration/ }).isDisabled(), true,
      "registration must block submission before independent ID and selfie capture");
    console.log("PASS: mobile registration password Step 3 and two-proof Step 4 guards");
  } finally {
    await signupContext.close();
  }

  const response = await page.goto(base + "/~offline", { waitUntil: "domcontentloaded", timeout: 30000 });
  assert.equal(response?.status(), 200, "offline fallback page must load while connected");
  assert.equal(new URL(page.url()).pathname, "/~offline", "offline fallback must remain public and must not redirect to login");
  await page.getByRole("heading", { name: "No connection right now" }).waitFor({ timeout: 15000 });
  await page.waitForFunction(async () => {
    if (!("serviceWorker" in navigator)) return false;
    const registrations = await navigator.serviceWorker.getRegistrations();
    return registrations.some(registration => Boolean(registration.active));
  }, null, { timeout: 20000 });
  console.log("Active service worker registration detected");
  // A newly activated worker controls this page after the next navigation.
  // Do the navigation directly instead of evaluating controller and then
  // reloading: activation can trigger the reload between those two operations.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => Boolean(navigator.serviceWorker?.controller),
    null,
    { timeout: 15000 },
  );
  // The controller-change navigation can destroy the previous execution
  // context. waitForFunction already proves the page is controlled; avoid a
  // second evaluate round-trip against a context that may just have navigated.
  await page.waitForLoadState("domcontentloaded");

  // Read Cache Storage from the active service-worker execution context.
  // The worker's activate handler navigates open clients; page.evaluate can
  // therefore lose its document context between navigation and evaluation.
  const activeWorker = context.serviceWorkers().find((worker) =>
    worker.url().includes("/sw.js")
  );
  assert.ok(activeWorker, "active service worker execution context should be available");
  const workerScope = await activeWorker.evaluate(() => self.registration.scope);
  assert.equal(new URL(workerScope).origin, new URL(base).origin,
    "service worker scope must match the browser test origin");
  const cachesBefore = await activeWorker.evaluate(async () => await caches.keys());
  assert.ok(cachesBefore.length > 0, "PWA precache should exist");
  console.log("Worker activated; cache names:", cachesBefore.join(", "));
  const cachedRoutes = await activeWorker.evaluate(async () => {
    const routes = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const entry of await cache.keys()) {
        const p = new URL(entry.url).pathname;
        if (p.includes("offline") || p.includes("home") || p.includes("login")) routes.push(name + " :: " + p);
      }
    }
    return routes;
  });
  console.log("Cached fallback-related URLs:", cachedRoutes.join(", ") || "(none)");

  // This test has no authenticated resident session. Navigating to /home
  // would correctly redirect to /login; it cannot prove protected-route
  // offline behavior without a verified resident fixture. Check the actual
  // precached public fallback instead, while network connectivity is disabled.
  assert.ok(cachedRoutes.some((entry) => entry.endsWith(" :: /~offline")),
    "the public offline fallback document must be precached");
  // Seed a small PUBLIC document catalog in the same allowlisted IndexedDB
  // store used by Ate Sora. This proves the offline help UI actually renders
  // saved document information after the network is physically disconnected.
  // The fake names below are isolated to this test browser, never production.
  await activeWorker.evaluate(async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("barangay-public-snapshots-v1", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("snapshots"))
          request.result.createObjectStore("snapshots", { keyPath: "key" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("snapshots", "readwrite");
        tx.objectStore("snapshots").put({
          key: "document-types",
          data: [{
            id: "offline-smoke-public-test",
            name: "Offline Smoke Sample Service",
            description: "Public saved service catalog browser check",
          }],
          cachedAt: Date.now(),
          expiresAt: Date.now() + 60_000,
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
    });
  });
  await context.setOffline(true);
  const offlineResponse = await page.goto(base + "/~offline", { waitUntil: "domcontentloaded", timeout: 20000 });
  assert.equal(offlineResponse?.status(), 200, "offline fallback must be served from precache");
  assert.equal(new URL(page.url()).pathname, "/~offline", "offline fallback must not redirect to login");
  await page.getByRole("heading", { name: "No connection right now" }).waitFor({ timeout: 15000 });
  console.log("PASS: disconnected browser can open the precached public offline help page");
  await page.getByRole("heading", { name: "Saved barangay document services" }).waitFor({ timeout: 15000 });
  await page.getByText("Offline Smoke Sample Service", { exact: true }).waitFor({ timeout: 15000 });
  await page.getByText("Public saved service catalog browser check", { exact: true }).waitFor({ timeout: 15000 });
  console.log("PASS: disconnected browser renders saved public document services from IndexedDB");

  const leaks = await page.evaluate(async () => {
    const forbidden = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) {
        const url = new URL(request.url);
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/data/") ||
            ["/home", "/requests", "/profile"].includes(url.pathname)) {
          forbidden.push(cacheName + ": " + url.pathname);
        }
      }
    }
    return forbidden;
  });
  assert.deepEqual(leaks, [], "sensitive route/API responses must not be cached");
  console.log("PASS: no private routes or API requests in Cache Storage");
} finally {
  await browser.close();
}
