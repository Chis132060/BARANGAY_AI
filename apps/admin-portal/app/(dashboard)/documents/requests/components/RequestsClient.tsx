"use client";

import { useState, useEffect } from "react";
import { Filter } from "lucide-react";
import { RequestsTable } from "./RequestsTable";
import type { DocumentRequestItem } from "../../actions";
import { createClient } from "@/lib/supabase/client";

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
}

export function RequestsClient({ initialRequests, onRefresh, onUpdateStatus, onVerifyPayment }: RequestsClientProps) {
  const [requests, setRequests] = useState<DocumentRequestItem[]>(initialRequests);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to changes on document_requests table
    const channel = supabase
      .channel('admin-document-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, async (payload: any) => {
        // Targeted state update: Fetch the latest list when a record changes
        // For production, we can inject the specific row into state, but triggering a targeted refresh ensures joined data is fresh.
        const updated = await onRefresh(filter);
        setRequests(updated);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, onRefresh]);

  async function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    const updated = await onRefresh(newFilter);
    setRequests(updated);
  }

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
    try {
      await onUpdateStatus(requestId, status, remarks, customFee, paymentStatus, pickupInstructions, paymentDueDate, paymentReference, paymentNotes);
      const updated = await onRefresh(filter);
      setRequests(updated);
    } catch (err: any) {
      alert("Failed to update status: " + (err.message || "Please confirm database setup."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Requests Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, generate printable certificates, and notify residents for pickup.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {["All", "Pending", "Approved", "Ready for Pickup", "Released", "Completed", "Rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleFilterChange(tab)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === tab
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-accent text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <RequestsTable 
        requests={requests} 
        onAction={handleAction} 
        onVerifyPayment={async (pid, rid, stat, rem) => {
          try {
            await onVerifyPayment(pid, rid, stat, rem);
            const updated = await onRefresh(filter);
            setRequests(updated);
          } catch (err: any) {
            alert("Failed to verify payment: " + err.message);
          }
        }}
      />
    </div>
  );
}
