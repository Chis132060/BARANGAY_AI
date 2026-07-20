import { Scale, Plus } from "lucide-react";

export const metadata = { title: "Katarungang Pambarangay | Admin" };

const mockKP = [
  { caseNo: "KP-2026-004", complainant: "Mariano Ponce", respondent: "Emilio Jacinto", nature: "Property Boundary Dispute", hearingDate: "2026-07-25", status: "Ongoing Mediation" },
  { caseNo: "KP-2026-002", complainant: "Clara Reyes", respondent: "Jose Rizal", nature: "Unpaid Loan / Debt", hearingDate: "2026-07-15", status: "Settled" },
];

export default function KatarungangPambarangayPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Katarungang Pambarangay</h1>
          <p className="text-sm text-muted-foreground mt-1">Barangay conciliation, Lupon Tagapamayapa dispute mediation records.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> File KP Case
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Case No.</th>
              <th className="px-6 py-3">Complainant vs Respondent</th>
              <th className="px-6 py-3">Dispute Nature</th>
              <th className="px-6 py-3">Next Hearing</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockKP.map((kp) => (
              <tr key={kp.caseNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{kp.caseNo}</td>
                <td className="px-6 py-4 font-medium">{kp.complainant} <span className="text-muted-foreground text-xs font-normal">vs</span> {kp.respondent}</td>
                <td className="px-6 py-4 text-muted-foreground">{kp.nature}</td>
                <td className="px-6 py-4 font-mono text-xs">{kp.hearingDate}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    kp.status === "Settled" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {kp.status}
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
