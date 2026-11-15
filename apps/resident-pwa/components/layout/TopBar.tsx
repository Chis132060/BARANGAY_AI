"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Wifi, WifiOff } from "lucide-react";

/** Global app header: the full notification center remains in Profile settings.
 * A device-network indicator replaces the duplicate notification bell.
 */
export function TopBar() {
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

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 shadow-sm">
      <Link href="/home" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        <img src="/logo.png" alt="Barangay Logo" className="h-8 w-auto shrink-0 object-contain" />
        <span className="truncate text-base font-bold tracking-tight text-slate-900">Smart Barangay</span>
      </Link>
      <span
        role="status"
        aria-live="polite"
        title="Device connection indicator only. Server availability is checked when you submit."
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold ${online === true
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : online === false
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-slate-200 bg-slate-50 text-slate-500"}`}
      >
        {online === false ? <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Wifi className="h-3.5 w-3.5" aria-hidden="true" />}
        {online === null ? "Checking" : online ? "Online" : "Offline"}
      </span>
    </header>
  );
}
