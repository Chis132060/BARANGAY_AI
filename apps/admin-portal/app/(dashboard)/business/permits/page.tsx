import { Briefcase, Plus } from "lucide-react";

export const metadata = { title: "Business Permits | Admin" };

const mockPermits = [
  { permitNo: "BP-2026-0012", businessName: "Aling Nena Variety Store", type: "Barangay Business Clearance & Permit", validUntil: "2027-01-31", status: "Active" },
  { permitNo: "BP-2026-0045", businessName: "QuickFix Water Station", type: "Barangay Business Clearance & Permit", validUntil: "2027-01-31", status: "Active" },
];

export default function PermitsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Permits</h1>
          <p className="text-sm text-muted-foreground mt-1">Issued commercial permits and annual business renewals.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Issue Permit
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Permit No.</th>
              <th className="px-6 py-3">Business Name</th>
              <th className="px-6 py-3">Permit Type</th>
              <th className="px-6 py-3">Valid Until</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockPermits.map((bp) => (
              <tr key={bp.permitNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{bp.permitNo}</td>
                <td className="px-6 py-4 font-medium">{bp.businessName}</td>
                <td className="px-6 py-4 text-muted-foreground">{bp.type}</td>
                <td className="px-6 py-4 font-mono text-xs">{bp.validUntil}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {bp.status}
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
