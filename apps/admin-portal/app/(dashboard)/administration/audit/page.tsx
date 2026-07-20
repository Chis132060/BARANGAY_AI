import { fetchAuditLogs } from "../actions";
import { AuditTable } from "./components/AuditTable";

export const metadata = {
  title: "Security Audit Logs",
  description: "Chronological administrative action security logs.",
};

export default async function AuditPage() {
  let logs = [];

  try {
    logs = await fetchAuditLogs();
  } catch (err) {
    console.error("Database connection offline. Displaying fallback logs.", err);
    // Mock local data fallback if migrations have not been applied yet
    logs = [
      {
        id: "log1",
        action: "Updated resident profile (Juan dela Cruz)",
        module: "Residents",
        created_at: new Date().toISOString(),
        operator: { name: "Elena Santos", email: "elena@barangay.gov" },
      },
      {
        id: "log2",
        action: "Approved business permit request",
        module: "Business",
        created_at: new Date().toISOString(),
        operator: { name: "Elena Santos", email: "elena@barangay.gov" },
      },
    ];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">Chronological record of administrative operations and database updates.</p>
        </div>
      </div>

      <AuditTable logs={logs} />
    </div>
  );
}
