/**
 * (app) layout — authenticated shell with TopBar + BottomNav.
 * This is a CLIENT component so it can detect auth state and hide
 * navigation entirely for guests who land on public routes (e.g. /chat).
 */
"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { ResidentOnboardingDialog } from "@/components/onboarding/ResidentOnboardingDialog";
import { ConnectionBanner } from "@/components/offline/ConnectionBanner";
import { OfflineSyncRunner } from "@/components/offline/OfflineSyncRunner";
import { createClient } from "@/lib/supabase/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    // getSession reads cached auth context so the offline app shell stays available.
    void supabase.auth.getSession().then(({data:{session}})=>{
      if(active)setIsLoggedIn(!!session?.user);
    });
    if(navigator.onLine){
      void supabase.auth.getUser().then(({data:{user}})=>{
        if(active)setIsLoggedIn(!!user);
      }).catch(()=>{});
    }
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      if(active)setIsLoggedIn(!!session?.user);
    });
    return ()=>{active=false;subscription.unsubscribe();};
  }, []);

  if (isLoggedIn === null) {
    return <div className="relative flex flex-col max-w-md mx-auto bg-white shadow-xl min-h-screen">{children}</div>;
  }

  if (!isLoggedIn) {
    return <div className="relative flex flex-col max-w-md mx-auto bg-white min-h-screen">{children}</div>;
  }

  return (
    <div className="relative flex flex-col h-full max-w-md mx-auto bg-white shadow-xl min-h-screen">
      <TopBar />
      <ConnectionBanner />
      <OfflineSyncRunner />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: "var(--bottom-nav-height)" }}
      >
        {children}
      </main>
      <BottomNav />
      <ResidentOnboardingDialog />
    </div>
  );
}
