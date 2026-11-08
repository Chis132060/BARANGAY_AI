"use client";

import { useState, useEffect, useMemo } from "react";
import { Filter, FileText, AlertCircle, X } from "lucide-react";
import { RequestsTable } from "./RequestsTable";
import type { DocumentRequestItem } from "../../actions";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";

interface RequestsClientProps {
  initialRequests: DocumentRequestItem[];
  onRefresh: (status: string) => Promise<DocumentRequestItem[]>;
  onUpdateStatus: (
    id: string,
    status: string,
    remarks?: string,
    customFee?: number,
    paymentStatus?: "Unpaid" | "Paid" | "Waived" | "Free",
    pickupInstructions?: string,
    paymentDueDate?: string,
    paymentReference?: string,
    paymentNotes?: string
  ) => Promise<{ success: boolean }>;
  onVerifyPayment: (
    paymentId: string,
    requestId: string,
    status: "Paid" | "Rejected",
    remarks?: string
  ) => Promise<{ success: boolean }>;
  onRecordPayment: (
    requestId: string,
    input: { payment_status: "Paid" | "Waived" | "Unpaid"; reference?: string; notes?: string }
  ) => Promise<{ success: boolean }>;
}

const STATUS_TABS = ["All", "Pending", "Approved", "Ready for Pickup", "Released", "Completed", "Rejected"] as const;

const STAT_CONFIG: { status: string; label: string; color: string; dot: string }[] = [
  { status: "Pending",        label: "Pending",       color: "bg-amber-100 text-amber-800 border-amber-200",   dot: "bg-amber-400" },
  { status: "Approved",       label: "Approved",      color: "bg-indigo-100 text-indigo-800 border-indigo-200", dot: "bg-indigo-400" },
  { status: "Ready for Pickup", label: "Ready",       color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-400" },
  { status: "Released",       label: "Released",      color: "bg-purple-100 text-purple-800 border-purple-200", dot: "bg-purple-400" },
];

export function RequestsClient({ initialRequests, onRefresh, onUpdateStatus, onVerifyPayment, onRecordPayment }: RequestsClientProps) {
  const [requests, setRequests] = useState<DocumentRequestItem[]>(initialRequests);
  const [filter, setFilter] = useState("All");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live counts per status from all requests (always use "All" base for counts)
  const [allRequests, setAllRequests] = useState<DocumentRequestItem[]>(initialRequests);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-document-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "document_requests" }, async () => {
        const [filtered, all] = await Promise.all([onRefresh(filter), onRefresh("All")]);
        setRequests(filtered);
        setAllRequests(all);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [filter, onRefresh]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const req of allRequests) {
      counts[req.status] = (counts[req.status] ?? 0) + 1;
    }
    return counts;
  }, [allRequests]);

  async function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    setErrorMsg(null);
    const updated = await onRefresh(newFilter);
    setRequests(updated);
  }

  useEffect(() => {
    if (!errorMsg) return;
    const timer = window.setTimeout(() => setErrorMsg(null), 10000);
    return () => window.clearTimeout(timer);
  }, [errorMsg]);

  async function handleAction(
    requestId: string,
    status: string,
    remarks = "",
    customFee?: number,
    paymentStatus?: "Unpaid" | "Paid" | "Waived" | "Free",
    pickupInstructions?: string,
    paymentDueDate?: string,
    paymentReference?: string,
    paymentNotes?: string
  ) {
    setErrorMsg(null);
    try {
      await onUpdateStatus(requestId, status, remarks, customFee, paymentStatus, pickupInstructions, paymentDueDate, paymentReference, paymentNotes);
      const [filtered, all] = await Promise.all([onRefresh(filter), onRefresh("All")]);
      setRequests(filtered);
      setAllRequests(all);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update request status. Please confirm database setup.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Requests Queue"
        subtitle="Review, generate printable certificates, and notify residents for pickup."
        icon={FileText}
      />

      {/* Error toast — fixed so it is visible wherever the user has scrolled */}
      {errorMsg && (
        <div role="alert" className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-start gap-3 rounded-xl border border-destructive/30 bg-white p-3.5 text-xs font-medium text-destructive shadow-xl">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} aria-label="Dismiss" className="shrink-0 hover:opacity-70 transition-opacity">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Status Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CONFIG.map(({ status, label, color, dot }) => (
          <button
            key={status}
            onClick={() => handleFilterChange(status)}
            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all hover:shadow-sm ${
              filter === status ? `${color} shadow-xs` : "bg-card border-border text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </div>
            <span className="font-extrabold text-sm tabular-nums">{statusCounts[status] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleFilterChange(tab)}
            className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === tab
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/60 hover:bg-muted text-muted-foreground border border-transparent hover:border-border"
            }`}
          >
            {tab}
            {tab !== "All" && (statusCounts[tab] ?? 0) > 0 && (
              <span className="ml-1.5 text-[10px] font-extrabold opacity-70">
                {statusCounts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      <RequestsTable
        requests={requests}
        onAction={handleAction}
        onRecordPayment={async (requestId, input) => {
          setErrorMsg(null);
          try {
            await onRecordPayment(requestId, input);
            const [filtered, all] = await Promise.all([onRefresh(filter), onRefresh("All")]);
            setRequests(filtered);
            setAllRequests(all);
            return true;
          } catch (err: any) {
            setErrorMsg(err.message || "Failed to record payment.");
            return false;
          }
        }}
        onVerifyPayment={async (pid, rid, stat, rem) => {
          setErrorMsg(null);
          try {
            await onVerifyPayment(pid, rid, stat, rem);
            const updated = await onRefresh(filter);
            setRequests(updated);
          } catch (err: any) {
            setErrorMsg("Failed to verify payment: " + err.message);
          }
        }}
      />
    </div>
  );
}

