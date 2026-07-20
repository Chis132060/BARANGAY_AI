"use client";

import { AuditLogItem } from "../../actions";

interface AuditTableProps {
  logs: AuditLogItem[];
}

export function AuditTable({ logs }: AuditTableProps) {
  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
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
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground font-medium">
                  No security audit logs recorded.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
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
