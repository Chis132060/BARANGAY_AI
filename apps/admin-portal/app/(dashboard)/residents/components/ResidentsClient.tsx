"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter, X, Users, Download } from "lucide-react";
import { ResidentTable } from "./ResidentTable";
import { ResidentForm } from "../forms/ResidentForm";
import type { ResidentListItem } from "../actions";
import { PageHeader } from "@/components/ui/PageHeader";

type ClassificationFilter = "All" | "Voter" | "Senior" | "PWD" | "4Ps";

interface ResidentFilters {
  search: string;
  classification: ClassificationFilter;
}

interface ResidentsClientProps {
  initialResidents: ResidentListItem[];
  initialSearch?: string;
  onRefresh: (search: string, filter: string) => Promise<ResidentListItem[]>;
}

function getResidentAge(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age;
}

function useDebouncedValue(value: string, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delay);

    return () => window.clearTimeout(timeoutId);
  }, [delay, value]);

  return debouncedValue;
}

export function ResidentsClient({ initialResidents, initialSearch = "", onRefresh }: ResidentsClientProps) {
  const [residents, setResidents] = useState<ResidentListItem[]>(initialResidents);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState<ResidentFilters>({
    search: initialSearch,
    classification: "All",
  });
  const debouncedSearch = useDebouncedValue(filters.search);

  useEffect(() => {
    setFilters((current) => ({ ...current, search: initialSearch }));
  }, [initialSearch]);

  const displayedResidents = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();

    return residents.filter((resident) => {
      const fullName = [
        resident.first_name,
        resident.middle_name,
        resident.last_name,
      ].filter(Boolean).join(" ");
      const address = resident.address
        ? [
            resident.address.house_number,
            resident.address.street,
            resident.address.purok ? `Purok ${resident.address.purok}` : "",
          ].filter(Boolean).join(" ")
        : "";

      const matchesSearch = !normalizedSearch || [
        fullName,
        resident.first_name,
        resident.middle_name ?? "",
        resident.last_name,
        address,
        resident.address?.purok ?? "",
        resident.contact_number ?? "",
        resident.id,
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      const matchesClassification =
        filters.classification === "All" ||
        (filters.classification === "Voter" && resident.voter_status) ||
        (filters.classification === "Senior" && getResidentAge(resident.birth_date) >= 60) ||
        (filters.classification === "PWD" && resident.pwd_status) ||
        (filters.classification === "4Ps" && resident.four_ps_status);

      return matchesSearch && matchesClassification;
    });
  }, [debouncedSearch, filters.classification, residents]);

  function exportResidentsCsv() {
    const headers = ["Resident ID", "First Name", "Middle Name", "Last Name", "Birth Date", "Contact Number", "Verification", "House Number", "Street", "Purok", "Senior", "PWD", "4Ps"];
    const rows = displayedResidents.map((r) => [r.id, r.first_name, r.middle_name ?? "", r.last_name, r.birth_date, r.contact_number ?? "", r.verification_status ?? "", r.address?.house_number ?? "", r.address?.street ?? "", r.address?.purok ?? "", r.senior_status ? "Yes" : "No", r.pwd_status ? "Yes" : "No", r.four_ps_status ? "Yes" : "No"]);
    const escapeCell = (value: unknown) => {
      const raw = String(value ?? "");
      const safe = /^\\s*[=+@-]/.test(raw) ? "'" + raw : raw;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "barangay-residents.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  async function handleSuccess() {
    setShowForm(false);
    const updated = await onRefresh("", "All");
    setResidents(updated);
  }

  if (showForm) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader
          title="Register Resident"
          subtitle="Add a new verified resident record to the barangay database."
          icon={Users}
          actions={
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-accent transition-all"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          }
        />
        <ResidentForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Residents Registry"
        subtitle="Manage, search, and filter Barangay resident demographics and records."
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={exportResidentsCsv} className="flex items-center gap-2 border rounded-xl px-4 py-2.5 text-xs font-bold hover:bg-accent"><Download className="h-4 w-4" /> Export CSV</button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Add Resident
          </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search name, address, purok, contact…"
              className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-card border border-input rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, search: "" }))}
                aria-label="Clear resident search"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
          {/* Result count */}
          <span className="shrink-0 text-[11px] font-semibold text-muted-foreground bg-muted/60 border rounded-xl px-2.5 py-1.5 tabular-nums">
            {displayedResidents.length} / {residents.length}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {(["All", "Voter", "Senior", "PWD", "4Ps"] as ClassificationFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilters((current) => ({ ...current, classification: tab }))}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filters.classification === tab
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
      <ResidentTable residents={displayedResidents} />
    </div>
  );
}
