"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ClipboardList, Megaphone, MessageCircleMore, CircleUserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NAV_BADGES_CHANGED, countActiveRequests, countUnseenAnnouncements, readSeenAnnouncements } from "@/lib/navigation/nav-badges";

const tabs = [
  { href: "/home", path: "/home", label: "Home", icon: House },
  { href: "/requests", path: "/requests", label: "Requests", icon: ClipboardList },
  { href: "/announcements?tab=announcements", path: "/announcements", label: "Updates", icon: Megaphone },
  { href: "/chat", path: "/chat", label: "Ate Sora", icon: MessageCircleMore },
  { href: "/profile", path: "/profile", label: "Profile", icon: CircleUserRound },
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
      className="relative z-40 w-full shrink-0 bg-white pt-1.5"
      style={{
        paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
      }}
    >
      <nav
        aria-label="Main navigation"
        className="mx-auto grid h-[64px] w-full max-w-md grid-cols-5 items-center gap-1 rounded-full border border-slate-200 bg-white px-2 shadow-[0_3px_18px_rgba(15,23,42,0.09)] min-[375px]:px-2.5"
      >
        {tabs.map(({ href, path, label, icon: Icon }) => {
          const active = pathname === path || pathname.startsWith(path + "/");
          const count = path === "/requests" ? counts.requests : path === "/announcements" ? counts.updates : 0;
          const badgeDescription = path === "/requests" ? "active requests" : "new announcements";
          return (
            <Link
              key={path}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={count ? `${label}, ${count} ${badgeDescription}` : label}
              title={label}
              className={`group relative flex h-[50px] min-h-11 min-w-0 w-full touch-manipulation items-center justify-center rounded-full outline-none transition-[background-color,color] duration-150 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none ${
                active
                  ? "bg-[#e5f1ff] text-[#1765ed]"
                  : "bg-transparent text-slate-950 [@media(hover:hover)]:hover:bg-slate-50"
              }`}
            >
              <span className="relative flex items-center justify-center">
                <Icon
                  className="h-[27px] w-[27px] min-[375px]:h-[29px] min-[375px]:w-[29px]"
                  strokeWidth={active ? 2.55 : 2.4}
                  aria-hidden="true"
                />
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-3 -top-2.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full border-2 border-white bg-red-600 px-0.5 text-[10px] font-bold leading-none text-white"
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
