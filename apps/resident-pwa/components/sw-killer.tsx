"use client";

import { useEffect } from "react";

/** Clear production PWA workers left behind by earlier local builds only. */
export function ServiceWorkerCleanup() {
  useEffect(() => {
    // Keep the production service worker intact so offline support continues
    // to work. In development, an older production worker can serve stale JS
    // and leave the current React UI without working event handlers.
    if (process.env.NODE_ENV !== "development" || !("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      if (!registrations.length) return;
      await Promise.all(registrations.map((registration) => registration.unregister()));

      const reloadKey = "smart-barangay-sw-cleanup-reloaded";
      if (navigator.serviceWorker.controller && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "true");
        window.location.reload();
      }
    }).catch((error) => {
      console.warn("[SW] Could not remove stale development service workers:", error);
    });
  }, []);

  return null;
}
