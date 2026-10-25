"use client";
import { useEffect, useState } from "react";
export function ConnectionBanner() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (online !== false) return null;
  return <div role="status" aria-live="polite" className="bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-2 text-xs text-center font-semibold">
    Offline — cached information may be outdated. Queued support tickets are not received until syncing succeeds.
  </div>;
}
