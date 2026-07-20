"use client";

import { useState } from "react";
import { Bell, Search, LogOut, ShieldCheck, Command, Check, Sparkles, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useAuth } from "../auth-provider";

export function Header() {
  const { user, role, signOut } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const displayName = user?.email?.split("@")[0] || "Staff";
  const userInitials = displayName.charAt(0).toUpperCase();

  const mockNotifications = [
    { id: 1, title: "New Document Request", desc: "Juan Dela Cruz requested Barangay Clearance", time: "5m ago", unread: true },
    { id: 2, title: "New Resident Registered", desc: "Maria Santos submitted resident record", time: "25m ago", unread: true },
    { id: 3, title: "Incident Report Logged", desc: "Tanod on-duty logged noise complaint in Purok 3", time: "2h ago", unread: false },
  ];

  return (
    <header className="h-16 shrink-0 border-b bg-card/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between transition-all">
      {/* Quick Search Bar */}
      <div className="flex items-center gap-2.5 text-muted-foreground border rounded-xl px-3.5 py-2 bg-muted/40 hover:bg-muted/60 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-background focus-within:border-primary transition-all w-72 md:w-96 shadow-inner">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="search"
          placeholder="Search residents, requests, permits..."
          className="bg-transparent text-xs font-medium outline-none w-full placeholder:text-muted-foreground/70"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground shadow-2xs">
          <Command className="h-3 w-3" />K
        </kbd>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-3">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications((p) => !p)}
            aria-label="Notifications"
            className="relative p-2.5 rounded-xl hover:bg-accent text-muted-foreground hover:text-foreground transition-all flex items-center justify-center border border-transparent hover:border-border"
          >
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border bg-card p-4 shadow-xl z-50 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2 font-semibold text-xs text-foreground uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Notifications
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                  2 New
                </span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {mockNotifications.map((n) => (
                  <div key={n.id} className={`p-2.5 rounded-xl text-xs space-y-1 transition-colors ${n.unread ? "bg-primary/5 border border-primary/10" : "hover:bg-accent"}`}>
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-foreground">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{n.time}</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{n.desc}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/communication/notifications"
                onClick={() => setShowNotifications(false)}
                className="block text-center text-xs font-semibold text-primary hover:underline pt-1"
              >
                View all notifications →
              </Link>
            </div>
          )}
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
