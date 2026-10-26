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
import { OfflineStatusCenter } from "@/components/offline/OfflineStatusCenter";
import { createClient } from "@/lib/supabase/client";
import { clearRequestSummaries } from "@/lib/offline/request-summaries";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    // getSession reads cached auth context so the offline app shell stays available.
    void supabase.auth.getSession().then(({data:{session}}: {data:{session:{user:{id:string}}|null}})=>{
      if(active)setIsLoggedIn(!!session?.user);
    });
    if(navigator.onLine){
      void supabase.auth.getUser().then(({data:{user}}: {data:{user:{id:string}|null}})=>{
        if(active)setIsLoggedIn(!!user);
      }).catch(()=>{});
    }
    let previousUserId: string | null = null;
    void supabase.auth.getSession().then(({data:{session}}: {data:{session:{user:{id:string}}|null}})=>{
      previousUserId = session?.user?.id ?? null;
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event:string,session:{user:{id:string}}|null)=>{
      const nextUserId = session?.user?.id ?? null;
      // Avoid leaving resident request summaries readable after logout/account switch.
      // Pending outbox entries are separately user-scoped and deliberately retained.
      if ((event === "SIGNED_OUT" || (previousUserId && nextUserId && previousUserId !== nextUserId)) && previousUserId) {
        void clearRequestSummaries(previousUserId).catch(error =>
          console.warn("[Offline] Could not clear private request summaries:", error)
        );
      }
      previousUserId = nextUserId;
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
      <OfflineStatusCenter />
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
