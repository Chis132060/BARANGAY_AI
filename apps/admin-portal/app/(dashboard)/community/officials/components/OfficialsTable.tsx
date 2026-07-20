"use client";

import { OfficialItem } from "../../actions";

interface OfficialsTableProps {
  officials: OfficialItem[];
}

export function OfficialsTable({ officials }: OfficialsTableProps) {
  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <th className="px-6 py-4">Official Name</th>
            <th className="px-6 py-4">Position</th>
            <th className="px-6 py-4">Term Started</th>
            <th className="px-6 py-4">Term Ended</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-sm">
          {officials.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground font-medium">
                No active Barangay Officials registered.
              </td>
            </tr>
          ) : (
            officials.map((off) => (
              <tr key={off.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-6 py-4 font-semibold text-foreground">
                  {off.resident ? `${off.resident.last_name}, ${off.resident.first_name}` : "—"}
                </td>
                <td className="px-6 py-4 text-muted-foreground font-medium">{off.position}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(off.start_term).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-muted-foreground">
                  {off.end_term ? new Date(off.end_term).toLocaleDateString() : "Present"}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${off.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {off.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
