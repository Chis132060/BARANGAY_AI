"use client";
import { NotificationOnboarding } from "@/components/onboarding/NotificationOnboarding";


import { useEffect, useState } from "react";
import { ClipboardList, Megaphone, ChevronRight, Sparkles, FileText, Bot } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { loadPublicSnapshot } from "@/lib/offline/public-snapshots";

const quickActions = [
  { href: "/requests/new", label: "Request a Document", description: "Apply for a certificate or clearance", icon: FileText },
  { href: "/requests", label: "Track My Requests", description: "See progress and pickup details", icon: ClipboardList },
  { href: "/chat", label: "Ask Ate Sora", description: "Get help with barangay services", icon: Bot },
  { href: "/announcements", label: "Barangay Updates", description: "Read official announcements", icon: Megaphone },
];

const popularDocuments = [
  { href: "/requests/new?document=clearance", label: "Barangay Clearance" },
  { href: "/requests/new?document=indigency", label: "Certificate of Indigency" },
  { href: "/requests/new?document=business", label: "Business Clearance" },
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
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        // A missing or expired session must not become a PostgREST filter like
        // `user_id=eq.`. Middleware will route the visitor back to sign-in.
        if (authError || !user) return;

        const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Resident";
        setResidentName(name.charAt(0).toUpperCase() + name.slice(1));

        // 2. Fetch latest published announcement posted by Admin
        const { data: annData } = await supabase
          .from("announcements")
          .select("id, title, description, category, published_date")
          .eq("status", "Published")
          .order("published_date", { ascending: false })
          .limit(1);

        if (annData && annData.length > 0) {
          setLatestAnnouncement(annData[0]);
        } else {
          try {
            const cached = await loadPublicSnapshot<Array<{id:string;title:string;description:string;category:string;created_at:string}>>("announcements");
            if (cached?.data.length) setLatestAnnouncement(cached.data[0]);
          } catch { /* browser storage may be unavailable */ }
        }

        // 3. Fetch active document request if any
        let reqData: any[] | null = null;
        const { data: resident } = await supabase
          .from("residents")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (resident) {
          const response = await supabase
            .from("document_requests")
            .select("id, status, requested_date, document_type:document_types(name)")
            .eq("resident_id", resident.id)
            .order("requested_date", { ascending: false })
            .limit(1);
          reqData = response.data;
        }

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
        <h1 className="text-xl font-extrabold mt-1">Kumusta, {residentName}!</h1>
        <p className="text-sm text-blue-100 mt-1">What would you like to do today?</p>
      </section>

      <NotificationOnboarding />
      {/* Quick Actions */}
      <section>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
          What do you need?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ href, label, description, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[132px] flex-col items-start gap-2 rounded-2xl border border-blue-100
                         bg-blue-50/60 p-4 transition-colors hover:bg-blue-100/70
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              <div className="rounded-xl bg-white p-2.5 text-blue-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-sm font-bold leading-tight text-gray-900">{label}</span>
              <span className="text-xs leading-snug text-gray-600">{description}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Direct shortcuts keep the selected document when the application opens. */}
      <section aria-label="Popular document applications">
        <h2 className="mb-2 text-sm font-bold text-gray-800">Popular documents</h2>
        <p className="mb-3 text-xs text-gray-600">Tap a document to start its application.</p>
        <div className="flex flex-wrap gap-2">
          {popularDocuments.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-full border border-blue-200 bg-white px-3.5 py-2
                         text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline
                         focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              {item.label}
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

        {loading ? (
          <div role="status" className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500">
            Loading the latest advisory...
          </div>
        ) : latestAnnouncement ? (
          <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-2xs space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {latestAnnouncement.category || "General"}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                {new Date(latestAnnouncement.published_date || latestAnnouncement.created_at).toLocaleDateString()}
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

        {loading ? (
          <div role="status" className="rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm text-gray-500">
            Loading your latest request...
          </div>
        ) : activeRequest ? (
          <Link href="/requests" className="bg-white rounded-2xl border border-gray-100 p-4 shadow-2xs flex items-center justify-between gap-3 hover:border-blue-300" aria-label="View latest document request">
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-900">
                {activeRequest.document_type?.name || "Barangay Document"}
              </p>
              <p className="text-xs text-gray-500">
                Submitted {new Date(activeRequest.requested_date).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              activeRequest.status === "Approved" || activeRequest.status === "Released"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}>
              {activeRequest.status}
            </span>
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center bg-gray-50/50 space-y-2">
            <ClipboardList className="h-7 w-7 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-gray-600">No recent document requests</p>
            <Link
              href="/requests/new"
              className="inline-block text-xs font-bold text-blue-600 hover:underline"
            >
              Start a document request
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

