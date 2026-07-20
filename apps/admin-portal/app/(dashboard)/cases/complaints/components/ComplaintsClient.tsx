"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { ComplaintsTable } from "./ComplaintsTable";
import { ComplaintItem } from "../../actions";

interface ComplaintsClientProps {
  initialComplaints: ComplaintItem[];
  onRefresh: (status: string) => Promise<ComplaintItem[]>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}

export function ComplaintsClient({ initialComplaints, onRefresh, onUpdateStatus }: ComplaintsClientProps) {
  const [complaints, setComplaints] = useState<ComplaintItem[]>(initialComplaints);
  const [filter, setFilter] = useState("All");

  async function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    const updated = await onRefresh(newFilter);
    setComplaints(updated);
  }

  async function handleUpdate(id: string, status: string) {
    try {
      await onUpdateStatus(id, status);
      const updated = await onRefresh(filter);
      setComplaints(updated);
    } catch (err) {
      alert("Failed to update case status. Confirm database connectivity.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barangay Blotter Cases</h1>
          <p className="text-sm text-muted-foreground mt-1">Track complaints, investigation files, hearing schedules, and resolutions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {["All", "Filed", "Investigation", "Hearing", "Settlement", "Closed"].map((tab) => (
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

      <ComplaintsTable complaints={complaints} onUpdateStatus={handleUpdate} />
    </div>
  );
}
