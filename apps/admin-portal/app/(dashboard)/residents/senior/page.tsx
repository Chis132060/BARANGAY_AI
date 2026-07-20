import { Heart, Search, Download, Plus } from "lucide-react";

export const metadata = { title: "Senior Citizen Registry | Admin" };

const mockSeniors = [
  { oscaId: "OSCA-2024-089", name: "Corazon Aquino", age: 68, gender: "Female", status: "Active Pensioner" },
  { oscaId: "OSCA-2024-112", name: "Pedro Ramos", age: 74, gender: "Male", status: "Active Pensioner" },
  { oscaId: "OSCA-2025-045", name: "Rosa Rosal", age: 65, gender: "Female", status: "Newly Registered" },
];

export default function SeniorPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Senior Citizen Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">OSCA registered senior citizens and pension benefits directory.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 border px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent">
            <Download className="h-4 w-4" /> Export List
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
            <Plus className="h-4 w-4" /> Register Senior
          </button>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">OSCA ID</th>
              <th className="px-6 py-3">Full Name</th>
              <th className="px-6 py-3">Age</th>
              <th className="px-6 py-3">Gender</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockSeniors.map((senior) => (
              <tr key={senior.oscaId} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{senior.oscaId}</td>
                <td className="px-6 py-4 font-medium">{senior.name}</td>
                <td className="px-6 py-4 font-semibold">{senior.age} yrs</td>
                <td className="px-6 py-4 text-muted-foreground">{senior.gender}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                    {senior.status}
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
