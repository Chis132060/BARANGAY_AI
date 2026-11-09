"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, Megaphone, MessageCircle, User } from "lucide-react";

const tabs = [
  { href: "/home",          label: "Home",     icon: Home },
  { href: "/requests",      label: "Requests", icon: ClipboardList },
  { href: "/announcements", label: "Updates",  icon: Megaphone },
  { href: "/chat",          label: "Ate Sora",  icon: MessageCircle },
  { href: "/profile",       label: "Profile",  icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md
                 bg-white border-t border-gray-100 flex items-center justify-around
                 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-50"
      style={{ height: "var(--bottom-nav-height)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg
                        transition-colors min-w-[56px] focus-visible:outline focus-visible:outline-2
                        focus-visible:outline-offset-2 focus-visible:outline-blue-600
                        ${active ? "text-blue-700" : "text-gray-600 hover:text-blue-700"}`}
          >
            <Icon className={`h-5 w-5 transition-transform ${active ? "scale-110" : ""}`} />
            <span className={`text-xs font-medium ${active ? "font-semibold" : ""}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
