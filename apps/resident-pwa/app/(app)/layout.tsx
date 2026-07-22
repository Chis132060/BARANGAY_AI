/**
 * (app) layout — authenticated shell with TopBar + BottomNav.
 * This is a CLIENT component so it can detect auth state and hide
 * navigation entirely for guests who land on public routes (e.g. /chat).
 */
"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { createClient } from "@/lib/supabase/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  // While checking auth — render frameless (avoids flash of nav for guests)
  if (isLoggedIn === null) {
    return (
      <div className="relative flex flex-col max-w-md mx-auto bg-white shadow-xl min-h-screen">
        {children}
      </div>
    );
  }

  // Guest mode — no TopBar or BottomNav, just full-screen content
  if (!isLoggedIn) {
    return (
      <div className="relative flex flex-col max-w-md mx-auto bg-white min-h-screen">
        {children}
      </div>
    );
  }

  // Authenticated — full app shell
  return (
    <div className="relative flex flex-col h-full max-w-md mx-auto bg-white shadow-xl min-h-screen">
      <TopBar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "var(--bottom-nav-height)" }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
