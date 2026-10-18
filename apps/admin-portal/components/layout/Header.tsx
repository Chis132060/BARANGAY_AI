"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Bell, Search, LogOut, Command, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";
import { createClient } from "@/lib/supabase/client";

interface HeaderNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  rawDate: string;
  isRead: boolean;
  href: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Math.max(1, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.round(diff / 60)}h ago`;
  return `${Math.round(diff / 1440)}d ago`;
}

export function Header() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const quickSearchRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Derive best available display name
  const rawName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Staff";
  const displayName = rawName
    .split(/[\s._-]+/)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);

  const loadNotifications = useCallback(async () => {
    const supabase = createClient();
    try {
      const [{ data: docRequests }, { data: pendingResidents }] = await Promise.all([
        supabase
          .from("document_requests")
          .select("id, status, requested_date, document_type:document_types(name), resident:residents(first_name, last_name)")
          .eq("status", "Pending")
          .order("requested_date", { ascending: false })
          .limit(4),
        supabase
          .from("residents")
          .select("id, first_name, last_name, created_at")
          .eq("verification_status", "Pending")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const notifs: HeaderNotification[] = [];

      for (const doc of docRequests || []) {
        const resident = Array.isArray(doc.resident) ? doc.resident[0] : doc.resident;
        const docType = Array.isArray(doc.document_type) ? doc.document_type[0] : doc.document_type;
        notifs.push({
          id: `doc-${doc.id}`,
          title: "New Document Request",
          desc: `${resident ? `${resident.first_name} ${resident.last_name}` : "A resident"} requested ${docType?.name || "a document"}`,
          time: formatRelativeTime(doc.requested_date),
          rawDate: doc.requested_date,
          isRead: false,
          href: "/documents/requests",
        });
      }

      for (const resident of pendingResidents || []) {
        notifs.push({
          id: `resident-${resident.id}`,
          title: "New Resident Registration",
          desc: `${resident.first_name} ${resident.last_name} submitted a resident record`,
          time: formatRelativeTime(resident.created_at),
          rawDate: resident.created_at,
          isRead: false,
          href: "/residents/verification",
        });
      }

      notifs.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
      setNotifications(notifs.slice(0, 6));
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel("header-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "document_requests" }, () => {
        loadNotifications();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "residents" }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsNotificationOpen(false);
        setShowUserMenu(false);
      }
    }

    function handleQuickSearchShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        quickSearchRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("keydown", handleQuickSearchShortcut);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("keydown", handleQuickSearchShortcut);
    };
  }, []);

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }

  function markAllAsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  function handleQuickSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSearch = quickSearch.trim();
    const query = normalizedSearch ? `?search=${encodeURIComponent(normalizedSearch)}` : "";
    router.push(`/residents${query}`);
  }

  return (
    <header className="h-16 shrink-0 bg-card/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between transition-all">
      {/* Quick Search Bar */}
      <form
        onSubmit={handleQuickSearch}
        className="flex items-center gap-2.5 text-muted-foreground border rounded-xl px-3.5 py-2 bg-muted/40 hover:bg-muted/60 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-background focus-within:border-primary transition-all w-72 md:w-96"
      >
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={quickSearchRef}
          type="search"
          value={quickSearch}
          onChange={(event) => setQuickSearch(event.target.value)}
          placeholder="Search residents, requests, permits..."
          className="bg-transparent text-xs font-medium outline-none w-full placeholder:text-muted-foreground/70"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground shadow-2xs">
          <Command className="h-3 w-3" />K
        </kbd>
      </form>

      {/* Right Action Icons */}
      <div className="flex items-center gap-3">
        {/* Notifications Dropdown */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setIsNotificationOpen((prev) => !prev)}
            aria-label="Notifications"
            aria-expanded={isNotificationOpen}
            aria-haspopup="true"
            className="relative p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-all flex items-center justify-center border border-transparent hover:border-border"
          >
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
            )}
          </button>

          <div
            className={`absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border bg-card p-4 shadow-xl z-50 space-y-3 transition-all ${
              isNotificationOpen
                ? "pointer-events-auto opacity-100 scale-100 duration-200"
                : "pointer-events-none opacity-0 scale-95 duration-150"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2.5">
              <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                <Bell className="h-3.5 w-3.5 text-primary" />
                Notifications
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="text-[10px] text-muted-foreground hover:text-primary font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-6">
                  No pending activity
                </p>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => {
                      markAsRead(notification.id);
                      setIsNotificationOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs space-y-1 transition-colors block ${
                      !notification.isRead
                        ? "bg-primary/5 border border-primary/10"
                        : "hover:bg-accent border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground">{notification.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{notification.time}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{notification.desc}</p>
                  </Link>
                ))
              )}
            </div>

            <Link
              href="/communication/notifications"
              onClick={() => setIsNotificationOpen(false)}
              className="block text-center text-xs font-semibold text-primary hover:underline pt-1"
            >
              View all notifications →
            </Link>
          </div>
        </div>

        {/* User Info & Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu((p) => !p)}
            className="flex items-center gap-3 pl-3 pr-2 py-1.5 rounded-xl hover:bg-accent border border-transparent hover:border-border transition-all"
          >
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold leading-none text-foreground">{displayName}</span>
              <span className="text-[10px] font-mono text-primary font-semibold leading-none mt-1 uppercase">
                {role}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-card p-2 shadow-xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b">
                <p className="text-xs font-bold text-foreground">{displayName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>

              <Link
                href="/administration/settings"
                onClick={() => setShowUserMenu(false)}
                className="block px-3 py-2 text-xs font-medium text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                Account Settings
              </Link>

              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive rounded-lg hover:bg-destructive/10 transition-colors text-left"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
