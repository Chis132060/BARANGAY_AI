"use client";

import { useEffect, useState } from "react";
import { Megaphone, Calendar, Sparkles, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: string;
  title: string;
  description: string;
  category: string;
  published_date: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, description, category, published_date")
        .eq("status", "Published")
        .order("published_date", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
      } else if (data && data.length > 0) {
        setAnnouncements(data);
      } else {
        // Fallback default announcements
        setAnnouncements([
          {
            id: "1",
            title: "Purok Clean-up Drive this Saturday",
            description: "Join us for our monthly community clean-up drive. Meet at the barangay hall at 6:00 AM.",
            category: "General",
            published_date: new Date().toISOString(),
          },
          {
            id: "2",
            title: "Free Vaccination Clinic for Children",
            description: "The health center will conduct free polio and measles vaccinations for children under 5 years old.",
            category: "Health",
            published_date: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredAnnouncements = selectedCategory === "All"
    ? announcements
    : announcements.filter((a) => a.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Barangay Updates</h1>
          <p className="text-xs text-gray-500">Official news and announcements from Barangay Hall</p>
        </div>
        <button
          onClick={loadAnnouncements}
          title="Refresh Feed"
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {["All", "General", "Health", "Event", "Emergency"].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="p-8 text-center text-xs text-gray-400">Loading announcements...</div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center bg-gray-50/50">
          <Megaphone className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-gray-600">No announcements found</p>
          <p className="text-xs text-gray-400 mt-1">Check back soon for new updates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((ann) => (
            <div key={ann.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                  ann.category === "Emergency" ? "bg-red-100 text-red-700" :
                  ann.category === "Health" ? "bg-amber-100 text-amber-800" :
                  "bg-blue-100 text-blue-800"
                }`}>
                  {ann.category}
                </span>
                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(ann.published_date).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-sm font-bold text-gray-900 leading-snug">{ann.title}</h2>
              <p className="text-xs text-gray-600 leading-relaxed">{ann.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
