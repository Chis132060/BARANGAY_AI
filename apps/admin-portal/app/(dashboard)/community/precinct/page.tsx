import { Building2, Plus, Users } from "lucide-react";

export const metadata = { title: "Precinct Management | Admin" };

const mockPrecincts = [
  { precinctNo: "PRECINCT 001A", location: "Barangay Elementary School", registeredVoters: 450, status: "Active" },
  { precinctNo: "PRECINCT 001B", location: "Barangay Elementary School", registeredVoters: 420, status: "Active" },
  { precinctNo: "PRECINCT 002A", location: "Barangay Multi-Purpose Hall", registeredVoters: 390, status: "Active" },
];

export default function PrecinctPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Precinct Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Electoral precincts, voting centers, and voter distribution.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Add Precinct
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Precinct No.</th>
              <th className="px-6 py-3">Polling Location</th>
              <th className="px-6 py-3">Registered Voters</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockPrecincts.map((pr) => (
              <tr key={pr.precinctNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{pr.precinctNo}</td>
                <td className="px-6 py-4 font-medium">{pr.location}</td>
                <td className="px-6 py-4 font-semibold">{pr.registeredVoters} Voters</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {pr.status}
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
