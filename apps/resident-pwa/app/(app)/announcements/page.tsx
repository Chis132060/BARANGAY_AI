import type { Metadata } from "next";
import { Megaphone } from "lucide-react";

export const metadata: Metadata = { title: "Announcements" };

const CATEGORY_COLORS: Record<string, string> = {
  general:        "bg-gray-100 text-gray-600",
  health:         "bg-green-100 text-green-700",
  safety:         "bg-red-100 text-red-700",
  events:         "bg-purple-100 text-purple-700",
  infrastructure: "bg-orange-100 text-orange-700",
};

export default function AnnouncementsPage() {
  // TODO: Fetch Announcement[] via TanStack Query + Supabase Realtime

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Announcements</h1>

      {/* Category filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {["All", "Health", "Safety", "Events", "Infrastructure"].map((cat) => (
          <button
            key={cat}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                       bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700
                       transition-colors"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
        <Megaphone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No announcements yet</p>
        <p className="text-xs text-gray-400 mt-1">Check back soon for updates from the barangay.</p>
      </div>
    </div>
  );
}
