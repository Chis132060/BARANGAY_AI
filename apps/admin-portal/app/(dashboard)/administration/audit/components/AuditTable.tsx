"use client";

import { FormEvent, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { AuditLogItem } from "../../actions";

interface AuditTableProps {
  logs: AuditLogItem[];
}

export function AuditTable({ logs }: AuditTableProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return logs;

    return logs.filter((log) => {
      const timestamp = new Date(log.created_at).toLocaleString();
      const operatorName = log.operator?.name ?? "System / Background";
      const operatorEmail = log.operator?.email ?? "";

      return [
        timestamp,
        operatorName,
        operatorEmail,
        log.module,
        log.action,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [logs, searchQuery]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchQuery(searchInput);
  }

  function clearSearch() {
    setSearchInput("");
    setSearchQuery("");
  }

  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      <div className="flex flex-col gap-3 border-b bg-muted/10 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Audit Trail</h2>
          <p className="text-xs text-muted-foreground">
            Showing {filteredLogs.length} of {logs.length} log{logs.length === 1 ? "" : "s"}
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex w-full flex-col gap-2 sm:flex-row md:max-w-xl">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                if (!event.target.value) setSearchQuery("");
              }}
              placeholder="Search timestamp, operator, module, or action"
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {(searchInput || searchQuery) && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear audit search"
                className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground transition-colors -translate-y-1/2 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Search className="h-4 w-4" />
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Operator</th>
              <th className="px-6 py-4">Module</th>
              <th className="px-6 py-4">Action Performed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground font-medium">
                  {searchQuery ? "No audit logs match your search." : "No security audit logs recorded."}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    {log.operator ? log.operator.name : "System / Background"}
                    {log.operator?.email && (
                      <span className="block text-[10px] text-muted-foreground font-normal">{log.operator.email}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">
                    {log.action}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
