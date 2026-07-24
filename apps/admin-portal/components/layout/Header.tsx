"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Search, LogOut, Command, Sparkles, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-provider";

interface HeaderNotification {
  id: number;
  title: string;
  desc: string;
  time: string;
  isRead: boolean;
}

export function Header() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const quickSearchRef = useRef<HTMLInputElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const displayName = user?.email?.split("@")[0] || "Staff";
  const userInitials = displayName.charAt(0).toUpperCase();

  const [notifications, setNotifications] = useState<HeaderNotification[]>([
    { id: 1, title: "New Document Request", desc: "Juan Dela Cruz requested Barangay Clearance", time: "5m ago", isRead: false },
    { id: 2, title: "New Resident Registered", desc: "Maria Santos submitted resident record", time: "25m ago", isRead: false },
    { id: 3, title: "Incident Report Logged", desc: "Tanod on-duty logged noise complaint in Purok 3", time: "2h ago", isRead: true },
  ]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
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

  function markNotificationAsRead(notificationId: number) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }

  function handleQuickSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSearch = quickSearch.trim();
    const query = normalizedSearch ? `?search=${encodeURIComponent(normalizedSearch)}` : "";

    router.push(`/residents${query}`);
  }

  return (
    <header className="h-16 shrink-0 border-b bg-card/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between transition-all">
      {/* Quick Search Bar */}
      <form
        onSubmit={handleQuickSearch}
        className="flex items-center gap-2.5 text-muted-foreground border rounded-xl px-3.5 py-2 bg-muted/40 hover:bg-muted/60 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-background focus-within:border-primary transition-all w-72 md:w-96 shadow-inner"
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
            className="relative p-2.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-all flex items-center justify-center border border-transparent hover:border-border"
          >
            <Bell className="h-4.5 w-4.5" />
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
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Notifications
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  {unreadCount} New
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markNotificationAsRead(notification.id)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs space-y-1 transition-colors ${
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
                  </button>
                ))}
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

            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-primary-foreground text-xs font-extrabold shadow-sm">
              {userInitials}
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
