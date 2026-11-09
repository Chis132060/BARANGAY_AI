import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.PWA_TEST_BASE_URL || "http://localhost:5173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: "allow" });
const page = await context.newPage();
try {
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

  await context.setOffline(true);
  const offlineResponse = await page.goto(base + "/home", { waitUntil: "domcontentloaded", timeout: 20000 });
  assert.ok(offlineResponse, "offline navigation should return fallback response");
  console.log("Offline navigation diagnostics:", JSON.stringify({
    url: page.url(),
    status: offlineResponse?.status(),
    headers: await offlineResponse?.allHeaders(),
    text: (await page.locator("body").innerText().catch(() => "(no body)")).slice(0, 1200),
  }));
  await page.getByRole("heading", { name: "No connection right now" }).waitFor({ timeout: 15000 });
  console.log("PASS: cold offline navigation produces usable fallback");

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
