import { Shield, Plus } from "lucide-react";

export const metadata = { title: "Roles & Permissions | Admin" };

const mockRoles = [
  { role: "Super Admin", usersCount: 2, description: "Full system administration access across all modules." },
  { role: "Barangay Captain", usersCount: 1, description: "Executive dashboard access, official approvals, and reports." },
  { role: "Secretary", usersCount: 3, description: "Resident registration, certificate issuance, and announcements." },
  { role: "Treasurer", usersCount: 2, description: "Collection, OR issuance, and financial reporting." },
  { role: "Staff", usersCount: 5, description: "Document request processing and general support." },
];

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure role-based access control (RBAC) rules.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Create Custom Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockRoles.map((r) => (
          <div key={r.role} className="border rounded-xl bg-card p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Shield className="h-5 w-5" />
                <h3>{r.role}</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {r.usersCount} Assigned Users
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
