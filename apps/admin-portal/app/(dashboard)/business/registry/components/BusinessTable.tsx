"use client";

import { BusinessItem } from "../../actions";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-700",
  Expired: "bg-red-100 text-red-700",
};

interface BusinessTableProps {
  businesses: BusinessItem[];
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}

export function BusinessTable({ businesses, onUpdateStatus }: BusinessTableProps) {
  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-4">Business Name</th>
              <th className="px-6 py-4">Owner</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Address</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {businesses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground font-medium">
                  No businesses registered.
                </td>
              </tr>
            ) : (
              businesses.map((biz) => (
                <tr key={biz.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4 font-semibold text-foreground">{biz.business_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {biz.owner ? `${biz.owner.last_name}, ${biz.owner.first_name}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{biz.business_type}</td>
                  <td className="px-6 py-4 text-muted-foreground max-w-xs truncate">{biz.address}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[biz.status] || "bg-gray-100 text-gray-700"}`}>
                      {biz.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1.5">
                    {biz.status === "Pending" && (
                      <button
                        onClick={() => onUpdateStatus(biz.id, "Active")}
                        className="px-2.5 py-1 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
                      >
                        Approve
                      </button>
                    )}
                    {biz.status === "Active" && (
                      <button
                        onClick={() => onUpdateStatus(biz.id, "Inactive")}
                        className="px-2.5 py-1 text-xs font-semibold bg-muted hover:bg-accent text-foreground border rounded-lg transition-all"
                      >
                        Deactivate
                      </button>
                    )}
                    {biz.status === "Inactive" && (
                      <button
                        onClick={() => onUpdateStatus(biz.id, "Active")}
                        className="px-2.5 py-1 text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground rounded-lg transition-all"
                      >
                        Reactivate
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
