"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Clock, RefreshCw, FileText, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DocRequest {
  id: string;
  status: string;
  remarks?: string;
  requested_date: string;
  document_type?: {
    name: string;
  };
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("document_requests")
        .select(`
          id,
          status,
          remarks,
          requested_date,
          document_type:document_types (
            name
          )
        `)
        .order("requested_date", { ascending: false });

      if (error) {
        console.error("Error fetching requests:", error);
      } else if (data && data.length > 0) {
        setRequests(data as any[]);
      } else {
        setRequests([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredRequests = activeTab === "All"
    ? requests
    : requests.filter((r) => r.status.toLowerCase().includes(activeTab.toLowerCase()));

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">My Requests</h1>
          <p className="text-xs text-gray-500">Track online document applications</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRequests}
            title="Refresh List"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <Link
            href="/requests/new"
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {["All", "Pending", "Approved", "Released"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeTab === tab
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Request Cards */}
      {loading ? (
        <div className="p-8 text-center text-xs text-gray-400">Loading document applications...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center bg-gray-50/50 space-y-2">
          <ClipboardList className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="text-sm font-semibold text-gray-600">No document requests found</p>
          <p className="text-xs text-gray-400">Tap &ldquo;New&rdquo; above to apply for a Barangay Clearance or Certificate.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isApproved = req.status === "Approved" || req.status === "Released";
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="font-bold text-xs text-gray-900">
                      {req.document_type?.name || "Barangay Document"}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                    isApproved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {req.status}
                  </span>
                </div>

                {req.remarks && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">{req.remarks}</p>
                )}

                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1">
                  <span>Applied: {new Date(req.requested_date).toLocaleDateString()}</span>
                  <span>ID: {req.id.slice(0, 8)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
