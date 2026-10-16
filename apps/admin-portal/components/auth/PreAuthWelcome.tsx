"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function PreAuthWelcome({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <img
          src="/logo.png"
          alt="Smart Barangay"
          className="h-12 w-auto animate-pulse object-contain opacity-80"
        />
      </main>
    );
  }

  return <>{children}</>;
}
