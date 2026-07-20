import type { Metadata } from "next";
import { ClipboardList, Megaphone, MessageCircle, Bell, ChevronRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "Home" };

const quickActions = [
  { href: "/requests/new", label: "Request Clearance",    emoji: "📄" },
  { href: "/requests/new", label: "Certificate",          emoji: "📋" },
  { href: "/requests/new", label: "Business Permit",      emoji: "🏪" },
  { href: "/chat",         label: "Ask AI Assistant",     emoji: "🤖" },
];

export default function HomePage() {
  return (
    <div className="p-4 space-y-6">
      {/* Greeting */}
      <section>
        <h1 className="text-xl font-bold text-gray-900">Good morning 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">How can we help you today?</p>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ href, label, emoji }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-start gap-2 p-4 bg-blue-50 hover:bg-blue-100
                         rounded-xl border border-blue-100 transition-colors"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-sm font-medium text-gray-800 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Active Requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            My Requests
          </h2>
          <Link href="/requests" className="text-sm text-blue-600 font-medium flex items-center gap-0.5">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {/* TODO: Fetch and render active ServiceRequest cards */}
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
          <ClipboardList className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No active requests</p>
          <Link href="/requests/new" className="mt-2 inline-block text-sm text-blue-600 font-medium">
            Submit a request →
          </Link>
        </div>
      </section>

      {/* Latest Announcement */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Latest Updates
          </h2>
          <Link href="/announcements" className="text-sm text-blue-600 font-medium flex items-center gap-0.5">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {/* TODO: Fetch latest Announcement */}
        <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
          <Megaphone className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No announcements yet</p>
        </div>
      </section>
    </div>
  );
}
