"use client";

import { ComplaintItem } from "../../actions";

const STATUS_STYLES: Record<string, string> = {
  Filed: "bg-yellow-100 text-yellow-700",
  Investigation: "bg-blue-100 text-blue-700",
  Hearing: "bg-purple-100 text-purple-700",
  Settlement: "bg-indigo-100 text-indigo-700",
  Closed: "bg-green-100 text-green-700",
};

interface ComplaintsTableProps {
  complaints: ComplaintItem[];
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}

export function ComplaintsTable({ complaints, onUpdateStatus }: ComplaintsTableProps) {
  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-4">Case ID</th>
              <th className="px-6 py-4">Complainant</th>
              <th className="px-6 py-4">Respondent</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Filed Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {complaints.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground font-medium">
                  No complaints filed.
                </td>
              </tr>
            ) : (
              complaints.map((comp) => (
                <tr key={comp.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    #{comp.id.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground">
                    {comp.complainant ? `${comp.complainant.last_name}, ${comp.complainant.first_name}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {comp.respondent ? `${comp.respondent.last_name}, ${comp.respondent.first_name}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground font-medium">{comp.category}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[comp.status] || "bg-gray-100 text-gray-700"}`}>
                      {comp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {new Date(comp.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right space-x-1.5">
                    {comp.status === "Filed" && (
                      <button
                        onClick={() => onUpdateStatus(comp.id, "Investigation")}
                        className="px-2 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                      >
                        Investigate
                      </button>
                    )}
                    {comp.status === "Investigation" && (
                      <button
                        onClick={() => onUpdateStatus(comp.id, "Hearing")}
                        className="px-2 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                      >
                        Schedule Hearing
                      </button>
                    )}
                    {comp.status === "Hearing" && (
                      <button
                        onClick={() => onUpdateStatus(comp.id, "Settlement")}
                        className="px-2 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
                      >
                        Record Settlement
                      </button>
                    )}
                    {comp.status !== "Closed" && (
                      <button
                        onClick={() => onUpdateStatus(comp.id, "Closed")}
                        className="px-2 py-1 text-xs font-semibold bg-muted hover:bg-accent text-foreground border rounded-lg transition-all"
                      >
                        Close
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
