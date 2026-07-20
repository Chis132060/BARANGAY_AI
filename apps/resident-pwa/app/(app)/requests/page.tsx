import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

export const metadata: Metadata = { title: "My Requests" };

const STATUS_STYLES: Record<string, string> = {
  pending:     "bg-yellow-100 text-yellow-700",
  in_review:   "bg-blue-100 text-blue-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  completed:   "bg-green-100 text-green-700",
  rejected:    "bg-red-100 text-red-700",
};

export default function RequestsPage() {
  // TODO: Fetch ServiceRequest[] via TanStack Query + Supabase

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">My Requests</h1>
        <Link
          href="/requests/new"
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white
                     text-sm font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          New
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {["All", "Pending", "In Progress", "Completed"].map((tab) => (
          <button
            key={tab}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                       bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700
                       transition-colors"
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
        <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-500">No requests yet</p>
        <p className="text-xs text-gray-400 mt-1">Tap &ldquo;New&rdquo; to submit your first request.</p>
      </div>
    </div>
  );
}
