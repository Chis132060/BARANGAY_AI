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
  return <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-950">
    <span>Your browser reports a possible connection problem. The app will still try the server; saved information may be outdated. Queued changes count as submitted only after confirmed sync.</span>
    <a href="/~offline" className="inline-flex min-h-11 items-center rounded-lg px-2 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-800">
      View offline help
    </a>
  </div>;
}
