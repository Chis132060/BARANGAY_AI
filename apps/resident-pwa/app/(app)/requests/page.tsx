"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Plus, Clock, RefreshCw, FileText, CheckCircle2,
  AlertCircle, DollarSign, MapPin, Sparkles, HelpCircle, ArrowRight, QrCode, X, Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import QRScanner from "@/components/payments/QRScanner";
import { submitPaymentReference } from "./payment-actions";

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

  // Payment UI State
  const [payingRequest, setPayingRequest] = useState<DocRequest | null>(null);
  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [referenceInput, setReferenceInput] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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

  const handleScan = (decodedText: string) => {
    setScannedQR(decodedText);
  };

  const handlePaymentSubmit = async () => {
    if (!payingRequest || !referenceInput) return;
    setSubmittingPayment(true);
    setPaymentError(null);
    try {
      await submitPaymentReference(payingRequest.id, referenceInput);
      setPayingRequest(null);
      setScannedQR(null);
      setReferenceInput("");
      loadRequests();
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

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
    <div className="p-4 space-y-4 pb-24 relative">
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
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      req.payment_status === "Paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : req.payment_status === "Pending"
                        ? "bg-blue-100 text-blue-800"
                        : req.payment_status === "Free" || isFree
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {req.payment_status || (isFree ? "Free" : "Unpaid")}
                    </span>
                    {!isFree && (!req.payment_status || req.payment_status === 'Unpaid' || req.payment_status === 'Rejected') && (
                      <button 
                        onClick={() => setPayingRequest(req)}
                        className="flex items-center gap-1 bg-gray-900 text-white px-2 py-1 rounded-md text-[10px] font-bold hover:bg-gray-800"
                      >
                        <QrCode className="h-3 w-3" /> Pay GCash
                      </button>
                    )}
                  </div>
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

      {/* Payment Modal */}
      {payingRequest && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95">
            {!scannedQR ? (
              <QRScanner
                onScan={handleScan}
                onCancel={() => setPayingRequest(null)}
              />
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">Confirm Payment</h3>
                  <button onClick={() => { setPayingRequest(null); setScannedQR(null); setReferenceInput(""); }} className="p-1 rounded-full hover:bg-gray-100">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-2">
                  <p className="text-xs text-blue-800">Scanned Destination:</p>
                  <p className="text-sm font-mono font-bold break-all text-blue-900">{scannedQR}</p>
                  <p className="text-xs text-blue-800 mt-2 font-medium">Please send exactly <strong className="text-lg">₱{payingRequest.fee_amount?.toFixed(2)}</strong> via GCash/Bank Transfer.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">Reference Number</label>
                  <input 
                    type="text"
                    value={referenceInput}
                    onChange={(e) => setReferenceInput(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                  <p className="text-[10px] text-gray-500">Enter the reference number from your payment receipt.</p>
                </div>

                {paymentError && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>{paymentError}</p>
                  </div>
                )}

                <button
                  disabled={submittingPayment || !referenceInput}
                  onClick={handlePaymentSubmit}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex justify-center items-center gap-2"
                >
                  {submittingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Submit Verification
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
