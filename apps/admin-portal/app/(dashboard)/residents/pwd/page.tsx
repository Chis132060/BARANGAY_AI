import { Accessibility, Search, Download, Plus } from "lucide-react";

export const metadata = { title: "PWD Directory | Admin" };

const mockPWDs = [
  { pwdId: "PWD-2025-012", name: "Gabriel Garcia", disabilityType: "Visual Impairment", guardian: "Elena Garcia", status: "Verified" },
  { pwdId: "PWD-2025-034", name: "Luzviminda Cruz", disabilityType: "Physical / Mobility", guardian: "Self", status: "Verified" },
];

export default function PWDPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PWD Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">Persons with Disability (PWD) barangay records & assistance program tracking.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Register PWD Member
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">PWD ID</th>
              <th className="px-6 py-3">Full Name</th>
              <th className="px-6 py-3">Disability Category</th>
              <th className="px-6 py-3">Guardian</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockPWDs.map((pwd) => (
              <tr key={pwd.pwdId} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{pwd.pwdId}</td>
                <td className="px-6 py-4 font-medium">{pwd.name}</td>
                <td className="px-6 py-4 text-muted-foreground">{pwd.disabilityType}</td>
                <td className="px-6 py-4">{pwd.guardian}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {pwd.status}
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
