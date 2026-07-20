import { Briefcase, Plus, Search } from "lucide-react";

export const metadata = { title: "Business Clearance | Admin" };

const mockClearances = [
  { clearanceNo: "BC-2026-088", businessName: "Aling Nena Variety Store", owner: "Elena Reyes", type: "SME Clearance", status: "Approved" },
  { clearanceNo: "BC-2026-092", businessName: "QuickFix Water Station", owner: "Mark Garcia", type: "Commercial Clearance", status: "Pending Review" },
];

export default function BusinessClearancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Clearance</h1>
          <p className="text-sm text-muted-foreground mt-1">Barangay business permits and clearance approvals directory.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> New Business Clearance
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Clearance No.</th>
              <th className="px-6 py-3">Business Name</th>
              <th className="px-6 py-3">Owner</th>
              <th className="px-6 py-3">Clearance Type</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockClearances.map((bc) => (
              <tr key={bc.clearanceNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{bc.clearanceNo}</td>
                <td className="px-6 py-4 font-medium">{bc.businessName}</td>
                <td className="px-6 py-4 text-muted-foreground">{bc.owner}</td>
                <td className="px-6 py-4">{bc.type}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    bc.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {bc.status}
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
