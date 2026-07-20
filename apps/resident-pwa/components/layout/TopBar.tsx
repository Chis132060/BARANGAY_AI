import { Bell, ShieldCheck } from "lucide-react";
import Link from "next/link";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100
                       shadow-sm flex items-center justify-between px-4 h-14">
      <Link href="/home" className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-base text-gray-900">Smart Barangay</span>
      </Link>
      <Link
        href="/announcements"
        aria-label="Notifications"
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-600"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
      </Link>
    </header>
  );
}
