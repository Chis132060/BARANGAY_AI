"use client";

import { useState } from "react";
import { Plus, Search, Filter, Sparkles, X } from "lucide-react";
import { ResidentTable } from "./ResidentTable";
import { ResidentForm } from "../forms/ResidentForm";
import type { ResidentListItem } from "../actions";

interface ResidentsClientProps {
  initialResidents: ResidentListItem[];
  onRefresh: (search: string, filter: string) => Promise<ResidentListItem[]>;
}

export function ResidentsClient({ initialResidents, onRefresh }: ResidentsClientProps) {
  const [residents, setResidents] = useState<ResidentListItem[]>(initialResidents);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  async function handleFilterChange(newFilter: string) {
    setFilter(newFilter);
    const updated = await onRefresh(search, newFilter);
    setResidents(updated);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const updated = await onRefresh(search, filter);
    setResidents(updated);
  }

  async function handleSuccess() {
    setShowForm(false);
    const updated = await onRefresh(search, filter);
    setResidents(updated);
  }

  if (showForm) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Register Resident</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Add a new verified resident record to the barangay database.</p>
          </div>
        </div>
        <ResidentForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Residents Registry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage, search, and filter Barangay resident demographics and records.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-primary/20"
        >
          <Plus className="h-4 w-4" />
          Add Resident
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearch} className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resident name..."
            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-card border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={async () => {
                setSearch("");
                const updated = await onRefresh("", filter);
                setResidents(updated);
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {["All", "Voter", "Senior", "PWD", "4Ps"].map((tab) => (
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
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <ResidentTable residents={residents} />
    </div>
  );
}
