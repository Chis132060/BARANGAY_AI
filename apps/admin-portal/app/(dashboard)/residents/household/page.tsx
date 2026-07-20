import { Users, Home, Search, Plus, Filter } from "lucide-react";

export const metadata = { title: "Household Management | Admin" };

const mockHouseholds = [
  { id: "HH-2026-001", head: "Juan Dela Cruz", address: "123 Mabini St., Purok 1", members: 5, status: "Verified" },
  { id: "HH-2026-002", head: "Maria Santos", address: "45 Rizal Ave., Purok 2", members: 4, status: "Verified" },
  { id: "HH-2026-003", head: "Antonio Luna", address: "78 Bonifacio Rd., Purok 3", members: 6, status: "Pending Verification" },
];

export default function HouseholdPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Household Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage barangay household records and family trees.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95 transition-all">
          <Plus className="h-4 w-4" /> Add Household
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search household by head of family or address..."
            className="w-full bg-background border rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button className="flex items-center gap-1.5 border px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent">
          <Filter className="h-4 w-4" /> Filter
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Household ID</th>
              <th className="px-6 py-3">Head of Family</th>
              <th className="px-6 py-3">Address</th>
              <th className="px-6 py-3">Members</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockHouseholds.map((hh) => (
              <tr key={hh.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{hh.id}</td>
                <td className="px-6 py-4 font-medium">{hh.head}</td>
                <td className="px-6 py-4 text-muted-foreground">{hh.address}</td>
                <td className="px-6 py-4 font-semibold">{hh.members}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    hh.status === "Verified" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {hh.status}
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
