"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Megaphone, ChevronRight, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const quickActions = [
  { href: "/requests/new", label: "Barangay Clearance", emoji: "📄" },
  { href: "/requests/new", label: "Indigency Certificate", emoji: "📋" },
  { href: "/requests/new", label: "Business Permit", emoji: "🏪" },
  { href: "/chat", label: "AI Resident Assistant", emoji: "🤖" },
];

export default function HomePage() {
  const [residentName, setResidentName] = useState("Resident");
  const [latestAnnouncement, setLatestAnnouncement] = useState<any>(null);
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // 1. Get current authenticated user name
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Resident";
          setResidentName(name.charAt(0).toUpperCase() + name.slice(1));
        }

        // 2. Fetch latest published announcement posted by Admin
        const { data: annData } = await supabase
          .from("announcements")
          .select("id, title, description, category, published_date")
          .eq("status", "Published")
          .order("published_date", { ascending: false })
          .limit(1);

        if (annData && annData.length > 0) {
          setLatestAnnouncement(annData[0]);
        }

        // 3. Fetch active document request if any
        const { data: reqData } = await supabase
          .from("document_requests")
          .select("id, status, requested_date, document_type:document_types(name)")
          .order("requested_date", { ascending: false })
          .limit(1);

        if (reqData && reqData.length > 0) {
          setActiveRequest(reqData[0]);
        }
      } catch (err) {
        console.error("Home load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  return (
    <div className="p-4 space-y-6 pb-20">
      {/* Greeting Banner */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-md">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-200 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-300" /> Smart Barangay Resident Portal
        </span>
        <h1 className="text-xl font-extrabold mt-1">Hello, {residentName} 👋</h1>
        <p className="text-xs text-blue-100 mt-0.5">Welcome to your online barangay services portal.</p>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          Quick Barangay Services
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ href, label, emoji }) => (
            <Link
              key={label}
              href={href}
              className="flex flex-col items-start gap-2 p-3.5 bg-blue-50/60 hover:bg-blue-100/70
                         rounded-2xl border border-blue-100 transition-all shadow-2xs"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-bold text-gray-800 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Announcement from Admin */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Latest Barangay Advisory
          </h2>
          <Link href="/announcements" className="text-xs text-blue-600 font-bold flex items-center gap-0.5 hover:underline">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {latestAnnouncement ? (
          <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-2xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {latestAnnouncement.category || "General"}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {new Date(latestAnnouncement.published_date).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-sm font-bold text-gray-900 leading-snug">{latestAnnouncement.title}</h3>
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{latestAnnouncement.description}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center bg-gray-50/50">
            <Megaphone className="h-7 w-7 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-500">No active announcements</p>
          </div>
        )}
      </section>

      {/* Active Requests */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            My Document Requests
          </h2>
          <Link href="/requests" className="text-xs text-blue-600 font-bold flex items-center gap-0.5 hover:underline">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {activeRequest ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-900">
                {activeRequest.document_type?.name || "Barangay Clearance"}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                Submitted {new Date(activeRequest.requested_date).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
              activeRequest.status === "Approved" || activeRequest.status === "Released"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}>
              {activeRequest.status}
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center bg-gray-50/50 space-y-2">
            <ClipboardList className="h-7 w-7 text-gray-300 mx-auto" />
            <p className="text-xs font-semibold text-gray-500">No active requests pending</p>
            <Link
              href="/requests/new"
              className="inline-block text-xs font-bold text-blue-600 hover:underline"
            >
              Submit a request →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
