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
    // An in-flow dock means the page and Ate Sora composer never hide behind it.
    // The safe area is owned by the outer gutter, not doubled inside the pill.
    <div
      data-mobile-nav-dock="true"
      className="relative z-40 w-full shrink-0 bg-gradient-to-t from-slate-100/95 via-slate-50/90 to-transparent pt-2"
      style={{
        paddingBottom: "max(10px, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(12px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(12px, env(safe-area-inset-right, 0px))",
      }}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto grid h-[68px] w-full max-w-md grid-cols-5 items-center gap-0.5 rounded-full border border-slate-200/95 bg-white px-1.5 shadow-[0_8px_32px_rgba(15,23,42,0.13),0_2px_6px_rgba(15,23,42,0.05)] min-[375px]:px-2"
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
              title={label}
              className={`group relative flex h-[54px] min-h-11 min-w-0 w-full touch-manipulation items-center justify-center rounded-full outline-none transition-[background-color,color,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 active:scale-95 motion-reduce:transition-none ${
                active
                  ? "bg-[#dfeeff] text-[#1765ed]"
                  : "text-slate-900 hover:bg-slate-100 hover:text-blue-700"
              }`}
            >
              <span className="relative flex items-center justify-center">
                <Icon
                  className={`h-6 w-6 min-[375px]:h-7 min-[375px]:w-7 ${
                    active ? "drop-shadow-[0_2px_4px_rgba(37,99,235,0.15)]" : ""
                  }`}
                  strokeWidth={active ? 2.65 : 2.2}
                  aria-hidden="true"
                />
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-3.5 -top-3 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-0.5 text-[10px] font-extrabold leading-none text-white shadow-sm"
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
