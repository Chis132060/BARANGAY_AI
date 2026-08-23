"use client";

import { useEffect, useState } from "react";
import { Bell, ShieldCheck, CheckCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function TopBar() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("notifications").select("id, title, message, read_status, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
      if (data) setNotifications(data);
    }
    load();
  }, [supabase]);

  const unread = notifications.filter((n) => !n.read_status).length;
  async function markRead(id: string) {
    setNotifications((items) => items.map((n) => n.id === id ? { ...n, read_status: true } : n));
    await supabase.from("notifications").update({ read_status: true }).eq("id", id);
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100
                       shadow-sm flex items-center justify-between px-4 h-14">
      <Link href="/home" className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-base text-gray-900">Smart Barangay</span>
      </Link>
      <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Notifications" className="relative p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-600">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">{unread}</span>}
      </button>
      {open && <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3"><p className="text-sm font-bold">Notifications</p><CheckCheck className="h-4 w-4 text-blue-600" /></div>
        <div className="max-h-72 overflow-y-auto">
          {notifications.length === 0 ? <p className="p-5 text-center text-xs text-gray-500">No new notifications</p> : notifications.map((n) => <button key={n.id} onClick={() => markRead(n.id)} className={`w-full text-left border-b px-4 py-3 hover:bg-blue-50 ${!n.read_status ? "bg-blue-50/60" : ""}`}><p className="text-xs font-bold text-gray-900">{n.title}</p><p className="mt-1 text-[11px] leading-relaxed text-gray-600">{n.message}</p><p className="mt-1 text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString()}</p></button>)}
        </div>
        <Link href="/announcements" onClick={() => setOpen(false)} className="block border-t p-3 text-center text-xs font-bold text-blue-600">View all updates</Link>
      </div>}
      </div>
    </header>
  );
}
