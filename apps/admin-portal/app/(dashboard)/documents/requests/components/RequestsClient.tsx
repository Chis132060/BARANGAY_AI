"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { RequestsTable } from "./RequestsTable";
import type { DocumentRequestItem } from "../../actions";

interface RequestsClientProps {
  initialRequests: DocumentRequestItem[];
  onRefresh: (status: string) => Promise<DocumentRequestItem[]>;
  onUpdateStatus: (id: string, status: string, remarks?: string) => Promise<{ success: boolean }>;
}

export function RequestsClient({ initialRequests, onRefresh, onUpdateStatus }: RequestsClientProps) {
  const [requests, setRequests] = useState<DocumentRequestItem[]>(initialRequests);
  const [filter, setFilter] = useState("All");

  async function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    const updated = await onRefresh(newFilter);
    setRequests(updated);
  }

  async function handleAction(requestId: string, status: string, remarks = "") {
    try {
      await onUpdateStatus(requestId, status, remarks);
      const updated = await onRefresh(filter);
      setRequests(updated);
    } catch (err) {
      alert("Failed to update status. Please confirm database setup.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Requests Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Review, approve, and track Barangay documents requested by residents.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {["All", "Pending", "Approved", "Released", "Completed", "Rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleFilterChange(tab)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === tab
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-accent text-muted-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <RequestsTable requests={requests} onAction={handleAction} />
    </div>
  );
}
