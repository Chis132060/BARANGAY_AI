"use client";

import { useEffect } from "react";

/**
 * Unregisters any lingering service workers from previous PWA builds.
 * This prevents old SW caches from intercepting navigation after login.
 */
export function SwKiller() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
          console.log("[SW] Unregistered stale service worker:", registration.scope);
        }
      });
    }
  }, []);

  return null;
}
