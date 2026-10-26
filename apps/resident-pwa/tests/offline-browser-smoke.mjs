import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.PWA_TEST_BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: "allow" });
const page = await context.newPage();
try {
  const response = await page.goto(base + "/~offline", { waitUntil: "networkidle", timeout: 45000 });
  assert.equal(response?.status(), 200, "offline fallback page must load while connected");
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, { timeout: 30000 }).catch(async () => {
    // First visit may only install the worker; reload after registration/activation.
    await page.evaluate(() => navigator.serviceWorker?.ready);
    await page.reload({ waitUntil: "networkidle" });
  });
  const hasController = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
  assert.ok(hasController, "production service worker should control the page");

  const cachesBefore = await page.evaluate(async () => await caches.keys());
  assert.ok(cachesBefore.length > 0, "PWA precache should exist");
  console.log("Worker activated; cache names:", cachesBefore.join(", "));

  await context.setOffline(true);
  const offlineResponse = await page.goto(base + "/home", { waitUntil: "domcontentloaded", timeout: 20000 });
  assert.ok(offlineResponse, "offline navigation should return fallback response");
  await page.getByText("No connection right now").waitFor({ timeout: 15000 });
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
