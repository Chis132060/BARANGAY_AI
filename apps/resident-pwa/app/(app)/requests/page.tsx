"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Plus, Clock, RefreshCw, FileText, CheckCircle2,
  AlertCircle, DollarSign, MapPin, Sparkles, HelpCircle, ArrowRight
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DocRequest {
  id: string;
  status: string;
  fee_amount?: number;
  payment_status?: string;
  session_id?: string;
  form_data?: any;
  pickup_date?: string;
  pickup_instructions?: string;
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
          fee_amount,
          payment_status,
          session_id,
          form_data,
          pickup_date,
          pickup_instructions,
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
    : requests.filter((r) => {
        if (activeTab === "Ready for Pickup") {
          return r.status.toLowerCase().includes("ready") || r.status.toLowerCase().includes("pickup");
        }
        return r.status.toLowerCase().includes(activeTab.toLowerCase());
      });

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("ready") || s.includes("pickup")) {
      return "bg-emerald-500 text-white font-extrabold shadow-2xs animate-pulse";
    }
    if (s === "approved") {
      return "bg-blue-100 text-blue-800 font-bold";
    }
    if (s === "released" || s === "completed") {
      return "bg-purple-100 text-purple-800 font-bold";
    }
    if (s === "rejected") {
      return "bg-red-100 text-red-800 font-bold";
    }
    return "bg-amber-100 text-amber-800 font-bold";
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">My Document Requests</h1>
          <p className="text-xs text-gray-500">Track status, fees, and pickup schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadRequests}
            title="Refresh List"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <Link
            href="/chat"
            className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI Request
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {["All", "Pending", "Ready for Pickup", "Approved", "Released"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
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
        <div className="p-12 text-center text-xs text-gray-400">Loading your applications...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 p-8 text-center bg-gray-50/50 space-y-3">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto" />
          <div>
            <p className="text-sm font-bold text-gray-700">No requests found</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Ask the AI Assistant or tap below to apply for a Clearance or Certificate.
            </p>
          </div>
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
          >
            Open Chatbot Assistant <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const isReadyForPickup =
              req.status.toLowerCase().includes("ready") ||
              req.status.toLowerCase().includes("pickup");
            const fee = req.fee_amount ?? 0;
            const isFree = fee === 0 || req.payment_status === "Free";

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all ${
                  isReadyForPickup
                    ? "border-emerald-300 ring-2 ring-emerald-500/20 bg-gradient-to-br from-white to-emerald-50/30"
                    : "border-gray-100"
                }`}
              >
                {/* Title and Status Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${isReadyForPickup ? "bg-emerald-100 text-emerald-700" : "bg-blue-50 text-blue-600"}`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-extrabold text-xs text-gray-900 block">
                        {req.document_type?.name || "Barangay Document"}
                      </span>
                      {req.session_id && (
                        <span className="text-[10px] text-gray-400 font-mono">
                          Batch: {req.session_id.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider ${getStatusBadge(req.status)}`}>
                    {req.status}
                  </span>
                </div>

                {/* Pickup Ready Alert Banner */}
                {isReadyForPickup && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-950 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Ready for Pick Up at Barangay Hall!</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      {req.pickup_instructions || "Please proceed to Frontline Window 2. Bring 1 Valid ID and exact payment if required."}
                    </p>
                    {req.pickup_date && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Schedule: {new Date(req.pickup_date).toLocaleDateString()} (8:00 AM - 5:00 PM)
                      </div>
                    )}
                  </div>
                )}

                {/* Fee and Payment Info */}
                <div className="flex items-center justify-between bg-gray-50/80 p-2.5 rounded-xl text-xs">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[11px]">Payment:</span>
                    <span className={`font-bold text-[11px] ${isFree ? "text-emerald-700" : "text-blue-700"}`}>
                      {isFree ? "FREE (₱0.00)" : `₱${fee.toFixed(2)}`}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    req.payment_status === "Paid"
                      ? "bg-emerald-100 text-emerald-800"
                      : req.payment_status === "Free" || isFree
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {req.payment_status || (isFree ? "Free" : "Pay at Barangay Hall")}
                  </span>
                </div>

                {/* Remarks / Purpose */}
                {req.remarks && (
                  <p className="text-[11px] text-gray-600 bg-gray-50/50 p-2 rounded-lg border border-gray-100">
                    {req.remarks}
                  </p>
                )}

                {/* Metadata Footer */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-50">
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
