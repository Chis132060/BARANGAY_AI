import { Award, Plus, Search } from "lucide-react";

export const metadata = { title: "4Ps Beneficiaries | Admin" };

const mock4Ps = [
  { householdNo: "4PS-REGION3-098", grantee: "Teresa Mendoza", childrenCount: 3, barangayCluster: "Purok 1", status: "Active Beneficiary" },
  { householdNo: "4PS-REGION3-104", grantee: "Rodrigo Reyes", childrenCount: 2, barangayCluster: "Purok 4", status: "Active Beneficiary" },
];

export default function FourPsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">4Ps Beneficiaries</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantawid Pamilyang Pilipino Program (4Ps) beneficiary management.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Add 4Ps Grantee
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">4Ps Household No.</th>
              <th className="px-6 py-3">Grantee Name</th>
              <th className="px-6 py-3">Covered Children</th>
              <th className="px-6 py-3">Cluster</th>
              <th className="px-6 py-3">Program Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mock4Ps.map((item) => (
              <tr key={item.householdNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{item.householdNo}</td>
                <td className="px-6 py-4 font-medium">{item.grantee}</td>
                <td className="px-6 py-4 font-semibold">{item.childrenCount} Students</td>
                <td className="px-6 py-4 text-muted-foreground">{item.barangayCluster}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {item.status}
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
