"use client";

import { useEffect, useState } from "react";
import { Megaphone, Calendar, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: string;
  title: string;
  body: string;
  target_audience: string;
  created_at: string;
}

const AUDIENCE_COLOR: Record<string, string> = {
  All:       "bg-blue-100 text-blue-800",
  Senior:    "bg-amber-100 text-amber-800",
  "4Ps":     "bg-purple-100 text-purple-800",
  Residents: "bg-green-100 text-green-800",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function loadAnnouncements() {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, target_audience, created_at")
      .eq("status", "Published")
      .order("created_at", { ascending: false });

    if (!error && data) setAnnouncements(data as Announcement[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAnnouncements();

    const channel = supabase
      .channel("resident-announcements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, () => {
        loadAnnouncements();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Barangay Updates</h1>
          <p className="text-xs text-gray-500">Official news and announcements from Barangay Hall</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live
          </span>
          <button onClick={loadAnnouncements} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-gray-400">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center bg-gray-50/50">
          <Megaphone className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-600">No announcements yet</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon for updates from Barangay Hall.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <article key={ann.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${AUDIENCE_COLOR[ann.target_audience] ?? "bg-gray-100 text-gray-700"}`}>
                  {ann.target_audience}
                </span>
                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(ann.created_at).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-sm font-bold text-gray-900 leading-snug">{ann.title}</h2>
              <p className="text-xs text-gray-600 leading-relaxed">{ann.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
