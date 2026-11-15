"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Megaphone, MessageCircle, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NAV_BADGES_CHANGED, countActiveRequests, countUnseenAnnouncements, readSeenAnnouncements } from "@/lib/navigation/nav-badges";

const tabs = [
  { href: "/home", path: "/home", label: "Home", icon: Home },
  { href: "/requests", path: "/requests", label: "Requests", icon: ClipboardList },
  { href: "/announcements?tab=announcements", path: "/announcements", label: "Updates", icon: Megaphone },
  { href: "/chat", path: "/chat", label: "Ate Sora", icon: MessageCircle },
  { href: "/profile", path: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [counts, setCounts] = useState({ requests: 0, updates: 0 });

  const refresh = useCallback(async () => {
    // The session identifies the local user; Supabase RLS enforces ownership.
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      setCounts({ requests: 0, updates: 0 });
      return;
    }

    const [resident, published] = await Promise.all([
      supabase.from("residents").select("id").eq("user_id", userId).maybeSingle(),
      supabase.from("announcements").select("id").eq("status", "Published").limit(200),
    ]);

    let requests: number | null = null;
    if (!resident.error && resident.data?.id) {
      const { data, error } = await supabase.from("document_requests")
        .select("status").eq("resident_id", resident.data.id).limit(200);
      if (!error && data) {
        requests = countActiveRequests(data.map((item: { status: string | null }) => item.status));
      }
    } else if (!resident.error) {
      requests = 0;
    }

    // Only published, actually loaded records contribute to the Updates badge.
    const updates = !published.error && published.data
      ? countUnseenAnnouncements(
          published.data.map((item: { id: string }) => item.id),
          readSeenAnnouncements(userId)
        ) : null;

    // Preserve the last confirmed counts on network error, instead of claiming 0.
    setCounts(previous => ({
      requests: requests ?? previous.requests,
      updates: updates ?? previous.updates,
    }));
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const safeRefresh = () => { if (active) void refresh().catch(() => {}); };
    safeRefresh();
    window.addEventListener("focus", safeRefresh);
    window.addEventListener("online", safeRefresh);
    window.addEventListener(NAV_BADGES_CHANGED, safeRefresh);
    window.addEventListener("barangay-outbox-synced", safeRefresh);
    const onVisibility = () => { if (!document.hidden) safeRefresh(); };
    document.addEventListener("visibilitychange", onVisibility);

    const channel = supabase.channel("resident-bottom-nav-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "document_requests" }, safeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, safeRefresh)
      .subscribe();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Avoid making Supabase calls synchronously inside an auth callback.
      window.setTimeout(safeRefresh, 0);
    });
    return () => {
      active = false;
      window.removeEventListener("focus", safeRefresh);
      window.removeEventListener("online", safeRefresh);
      window.removeEventListener(NAV_BADGES_CHANGED, safeRefresh);
      window.removeEventListener("barangay-outbox-synced", safeRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
      subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [supabase, refresh, pathname]);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ height: "var(--bottom-nav-height)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ href, path, label, icon: Icon }) => {
        const active = pathname.startsWith(path);
        const count = path === "/requests" ? counts.requests : path === "/announcements" ? counts.updates : 0;
        const badgeDescription = path === "/requests" ? "active requests" : "new announcements";
        return (
          <Link
            key={path}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={count ? `${label}, ${count} ${badgeDescription}` : label}
            className={`flex min-h-11 min-w-[56px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${active ? "text-blue-700" : "text-gray-600 hover:text-blue-700"}`}
          >
            <span className="relative">
              <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} aria-hidden="true" />
              {count > 0 && (
                <span aria-hidden="true" className="absolute -right-3 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </span>
            <span className={`text-xs font-medium ${active ? "font-semibold" : ""}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
