"use client";

import { DocumentRequestItem } from "../../actions";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  "Under Review": "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Released: "bg-purple-100 text-purple-700",
  Completed: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

interface RequestsTableProps {
  requests: DocumentRequestItem[];
  onAction: (requestId: string, status: string, remarks?: string) => Promise<void>;
}

export function RequestsTable({ requests, onAction }: RequestsTableProps) {
  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-4">Resident</th>
              <th className="px-6 py-4">Document Type</th>
              <th className="px-6 py-4">Requested Date</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Remarks</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground font-medium">
                  No document requests found.
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-semibold text-foreground">
                    {req.resident ? `${req.resident.last_name}, ${req.resident.first_name}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {req.document_type ? req.document_type.name : "—"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(req.requested_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status] || "bg-gray-100 text-gray-700"}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">
                    {req.remarks || "—"}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {req.status === "Pending" && (
                      <>
                        <button
                          onClick={() => onAction(req.id, "Approved")}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onAction(req.id, "Rejected", "Requirements incomplete")}
                          className="px-2.5 py-1 text-xs font-semibold bg-destructive hover:bg-destructive/95 text-destructive-foreground rounded-lg transition-all"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {req.status === "Approved" && (
                      <button
                        onClick={() => onAction(req.id, "Released")}
                        className="px-2.5 py-1 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg transition-all"
                      >
                        Mark Released
                      </button>
                    )}
                    {req.status === "Released" && (
                      <button
                        onClick={() => onAction(req.id, "Completed")}
                        className="px-2.5 py-1 text-xs font-semibold bg-muted hover:bg-accent text-foreground border rounded-lg transition-all"
                      >
                        Complete
                      </button>
                    )}
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
