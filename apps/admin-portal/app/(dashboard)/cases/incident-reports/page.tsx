import { AlertTriangle, Plus } from "lucide-react";

export const metadata = { title: "Incident Reports | Admin" };

const mockIncidents = [
  { reportNo: "IR-2026-015", type: "Noise Disturbance", location: "Purok 3 Basketball Court", reportedBy: "Anonymous Resident", time: "2026-07-19 22:30", status: "Resolved by Tanod" },
  { reportNo: "IR-2026-018", type: "Minor Traffic Accident", location: "Corner Main St. & Rizal Ave.", reportedBy: "Tanod On-Duty", time: "2026-07-20 08:15", status: "Under Investigation" },
];

export default function IncidentReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Incident Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Barangay Tanod blotter entries and public safety incidents.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Log New Incident
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Report No.</th>
              <th className="px-6 py-3">Incident Type</th>
              <th className="px-6 py-3">Location</th>
              <th className="px-6 py-3">Reporter</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockIncidents.map((ir) => (
              <tr key={ir.reportNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{ir.reportNo}</td>
                <td className="px-6 py-4 font-medium">{ir.type}</td>
                <td className="px-6 py-4 text-muted-foreground">{ir.location}</td>
                <td className="px-6 py-4">{ir.reportedBy}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    ir.status.includes("Resolved") ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {ir.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
