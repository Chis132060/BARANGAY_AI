"use client";

import { useState } from "react";
import { Filter } from "lucide-react";
import { BusinessTable } from "./BusinessTable";
import { BusinessItem } from "../../actions";

interface BusinessClientProps {
  initialBusinesses: BusinessItem[];
  onRefresh: (status: string) => Promise<BusinessItem[]>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}

export function BusinessClient({ initialBusinesses, onRefresh, onUpdateStatus }: BusinessClientProps) {
  const [businesses, setBusinesses] = useState<BusinessItem[]>(initialBusinesses);
  const [filter, setFilter] = useState("All");

  async function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    const updated = await onRefresh(newFilter);
    setBusinesses(updated);
  }

  async function handleUpdate(id: string, status: string) {
    try {
      await onUpdateStatus(id, status);
      const updated = await onRefresh(filter);
      setBusinesses(updated);
    } catch (err) {
      alert("Failed to update business status. Confirm database connectivity.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage, approve, and audit registered local businesses.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {["All", "Pending", "Active", "Inactive", "Expired"].map((tab) => (
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

      <BusinessTable businesses={businesses} onUpdateStatus={handleUpdate} />
    </div>
  );
}
