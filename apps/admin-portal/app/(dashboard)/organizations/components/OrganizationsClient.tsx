"use client";

import { useState, useTransition } from "react";
import {
  Handshake,
  Plus,
  Users,
  ChevronRight,
  X,
  Save,
  Search,
  Trash2,
  UserPlus,
  Car,
  Heart,
  Star,
  Globe,
} from "lucide-react";
import {
  BarangayOrganization,
  OrgMember,
  createOrganization,
  deleteOrganization,
  fetchOrgMembers,
  addOrgMember,
  removeOrgMember,
} from "../actions";

// ─── Color / Icon Map ─────────────────────────────────────────────────────────
const ORG_TYPE_STYLES: Record<string, { color: string; icon: React.ElementType }> = {
  OFW:        { color: "bg-blue-100 text-blue-700 border-blue-200",    icon: Globe },
  Cooperative:{ color: "bg-amber-100 text-amber-700 border-amber-200", icon: Car },
  Community:  { color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Users },
  Sectoral:   { color: "bg-purple-100 text-purple-700 border-purple-200", icon: Handshake },
  Youth:      { color: "bg-cyan-100 text-cyan-700 border-cyan-200",    icon: Star },
  Women:      { color: "bg-pink-100 text-pink-700 border-pink-200",    icon: Heart },
  Senior:     { color: "bg-orange-100 text-orange-700 border-orange-200", icon: Users },
  Religious:  { color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Star },
  Other:      { color: "bg-gray-100 text-gray-600 border-gray-200",    icon: Star },
};

function getOrgStyle(orgType: string, isCustom: boolean) {
  if (isCustom) return { color: "bg-violet-100 text-violet-700 border-violet-200", icon: Star };
  return ORG_TYPE_STYLES[orgType] || ORG_TYPE_STYLES.Other;
}

// ─── Members Panel ────────────────────────────────────────────────────────────
function MembersPanel({ org, onClose }: { org: BarangayOrganization; onClose: () => void }) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    contact_number: "",
    purok: "",
    role: "Member",
    date_joined: new Date().toISOString().slice(0, 10),
    status: "Active",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();

  useState(() => {
    fetchOrgMembers(org.id)
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.date_joined) {
      setFormError("Full name and date joined are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const result = await addOrgMember({ ...form, organization_id: org.id });
      setMembers((prev) => [{ ...form, id: result.id, organization_id: org.id, created_at: new Date().toISOString() }, ...prev]);
      setShowAdd(false);
      setForm({ full_name: "", contact_number: "", purok: "", role: "Member", date_joined: new Date().toISOString().slice(0, 10), status: "Active", notes: "" });
    } catch (err: any) {
      setFormError(err.message || "Failed to add member.");
    } finally {
      setSaving(false);
    }
  }

  function handleRemove(id: string) {
    if (!confirm("Remove this member?")) return;
    startTransition(async () => {
      try { await removeOrgMember(id); setMembers((prev) => prev.filter((m) => m.id !== id)); } catch {}
    });
  }

  const { color, icon: Icon } = getOrgStyle(org.org_type, org.is_custom);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-card border shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-base">{org.name}</h2>
              <p className="text-xs text-muted-foreground">{org.org_type} · {members.length} member{members.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {showAdd && (
          <form onSubmit={handleAdd} className="border-b px-6 py-4 bg-muted/30 space-y-3">
            {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{formError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">Full Name *</label>
                <input required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Contact</label>
                <input value={form.contact_number} onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
                  placeholder="09XXXXXXXXX" className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Purok</label>
                <input value={form.purok} onChange={(e) => setForm((f) => ({ ...f, purok: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option>Member</option>
                  <option>Officer</option>
                  <option>President</option>
                  <option>Vice President</option>
                  <option>Secretary</option>
                  <option>Treasurer</option>
                  <option>Volunteer</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Date Joined *</label>
                <input type="date" required value={form.date_joined} onChange={(e) => setForm((f) => ({ ...f, date_joined: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Add Member"}
              </button>
            </div>
          </form>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-3 border-b">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Members</span>
            <button onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
              <UserPlus className="h-3.5 w-3.5" /> Add Member
            </button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No members yet.</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-primary underline">Add the first member</button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-2.5">Name</th>
                  <th className="px-6 py-2.5">Role</th>
                  <th className="px-6 py-2.5">Purok</th>
                  <th className="px-6 py-2.5">Joined</th>
                  <th className="px-6 py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40">
                    <td className="px-6 py-3 font-medium">{m.full_name}
                      {m.contact_number && <div className="text-xs text-muted-foreground">{m.contact_number}</div>}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{m.role || "Member"}</span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{m.purok || "—"}</td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">{m.date_joined}</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleRemove(m.id)} disabled={isPending}
                        className="rounded-lg p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Create Organization Modal ────────────────────────────────────────────────
function CreateOrgModal({ onClose, onCreated }: { onClose: () => void; onCreated: (o: BarangayOrganization) => void }) {
  const [form, setForm] = useState({ name: "", code: "", description: "", org_type: "Community", president: "", contact: "", established_date: "", status: "Active", is_custom: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Organization name is required."); return; }
    setSaving(true); setError("");
    try {
      const result = await createOrganization(form as any);
      onCreated({ ...form, id: result.id, created_at: new Date().toISOString(), member_count: 0 });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create organization.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-bold text-base flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />Create New Organization</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">Organization Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Senior Citizens Federation"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Code / Acronym</label>
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. SCF"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Type</label>
                <select value={form.org_type} onChange={(e) => setForm((f) => ({ ...f, org_type: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option>Community</option>
                  <option>Cooperative</option>
                  <option>Sectoral</option>
                  <option>Youth</option>
                  <option>Women</option>
                  <option>Senior</option>
                  <option>OFW</option>
                  <option>Religious</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">President / Leader</label>
                <input value={form.president} onChange={(e) => setForm((f) => ({ ...f, president: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Contact</label>
                <input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                  placeholder="09XXXXXXXXX"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Established Date</label>
                <input type="date" value={form.established_date} onChange={(e) => setForm((f) => ({ ...f, established_date: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>On Hold</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
              <Save className="h-4 w-4" /> {saving ? "Creating…" : "Create Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Organizations Client ────────────────────────────────────────────────
interface Props {
  initialOrganizations: BarangayOrganization[];
}

export function OrganizationsClient({ initialOrganizations }: Props) {
  const [orgs, setOrgs] = useState<BarangayOrganization[]>(initialOrganizations);
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<BarangayOrganization | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = orgs.filter((o) =>
    `${o.name} ${o.code || ""} ${o.org_type}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(id: string, isCustom: boolean) {
    if (!isCustom) { alert("Built-in organizations cannot be deleted."); return; }
    if (!confirm("Delete this organization and all its members?")) return;
    startTransition(async () => {
      try { await deleteOrganization(id); setOrgs((prev) => prev.filter((o) => o.id !== id)); } catch {}
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Handshake className="h-5 w-5" />
            </span>
            Organizations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Community and sectoral organizations within the barangay.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New Organization
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: orgs.length, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Active", value: orgs.filter((o) => o.status === "Active").length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Built-in", value: orgs.filter((o) => !o.is_custom).length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Custom", value: orgs.filter((o) => o.is_custom).length, color: "text-violet-600", bg: "bg-violet-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl border p-4`}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search organizations…"
          className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((org) => {
          const { color, icon: Icon } = getOrgStyle(org.org_type, org.is_custom);
          return (
            <div key={org.id} onClick={() => setSelectedOrg(org)}
              className="group relative rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${org.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                    {org.status}
                  </span>
                  {org.is_custom && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(org.id, org.is_custom); }} disabled={isPending}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <h3 className="font-bold text-base leading-tight">{org.name}</h3>
                {org.code && <p className="text-xs font-semibold text-muted-foreground mt-0.5">{org.code}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{org.description || org.org_type}</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold">{org.member_count ?? 0}</span> members
                </div>
                {org.president && <span className="truncate max-w-[120px]">Pres: {org.president}</span>}
              </div>
              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-4 w-4 text-primary" />
              </div>
            </div>
          );
        })}

        {/* Add org card */}
        <button onClick={() => setShowCreate(true)}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all min-h-[180px]">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60"><Plus className="h-5 w-5" /></div>
          <p className="text-sm font-semibold">Create New Organization</p>
        </button>
      </div>

      {selectedOrg && <MembersPanel org={selectedOrg} onClose={() => setSelectedOrg(null)} />}
      {showCreate && <CreateOrgModal onClose={() => setShowCreate(false)} onCreated={(o) => setOrgs((prev) => [...prev, o])} />}
    </div>
  );
}
