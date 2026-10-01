"use client";

import { useState, useTransition } from "react";
import {
  BookOpen,
  Plus,
  Users,
  Shield,
  GraduationCap,
  AlertTriangle,
  Star,
  ChevronRight,
  X,
  Save,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  BarangayProgram,
  ProgramEnrollee,
  createProgram,
  deleteProgram,
  fetchEnrollees,
  addEnrollee,
  removeEnrollee,
} from "../actions";

// ─── Program Icon Map ─────────────────────────────────────────────────────────
const PROGRAM_ICONS: Record<string, React.ElementType> = {
  BCPC: Shield,
  "Barangay Protection of Children": Shield,
  CILC: GraduationCap,
  "BADAC 17-59": AlertTriangle,
  custom: Star,
};

function getProgramIcon(name: string) {
  return PROGRAM_ICONS[name] || Star;
}

const PROGRAM_COLORS: Record<string, string> = {
  BCPC: "bg-blue-100 text-blue-700 border-blue-200",
  "Barangay Protection of Children": "bg-purple-100 text-purple-700 border-purple-200",
  CILC: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "BADAC 17-59": "bg-red-100 text-red-700 border-red-200",
};

function getProgramColor(name: string, isCustom: boolean) {
  if (isCustom) return "bg-amber-100 text-amber-700 border-amber-200";
  return PROGRAM_COLORS[name] || "bg-gray-100 text-gray-700 border-gray-200";
}

// ─── Enrollee Modal ─────────────────────────────────────────────────────────
function EnrolleesPanel({
  program,
  onClose,
}: {
  program: BarangayProgram;
  onClose: () => void;
}) {
  const [enrollees, setEnrollees] = useState<ProgramEnrollee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    contact_number: "",
    purok: "",
    role: "Member",
    date_enrolled: new Date().toISOString().slice(0, 10),
    status: "Active",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();

  useState(() => {
    fetchEnrollees(program.id)
      .then(setEnrollees)
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.date_enrolled) {
      setFormError("Full name and enrollment date are required.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const result = await addEnrollee({ ...form, program_id: program.id });
      const newEnrollee: ProgramEnrollee = {
        ...form,
        id: result.id,
        program_id: program.id,
        created_at: new Date().toISOString(),
      };
      setEnrollees((prev) => [newEnrollee, ...prev]);
      setShowAdd(false);
      setForm({
        full_name: "",
        contact_number: "",
        purok: "",
        role: "Member",
        date_enrolled: new Date().toISOString().slice(0, 10),
        status: "Active",
        notes: "",
      });
    } catch (err: any) {
      setFormError(err.message || "Failed to add enrollee.");
    } finally {
      setSaving(false);
    }
  }

  function handleRemove(id: string) {
    if (!confirm("Remove this enrollee?")) return;
    startTransition(async () => {
      try {
        await removeEnrollee(id);
        setEnrollees((prev) => prev.filter((e) => e.id !== id));
      } catch {}
    });
  }

  const Icon = getProgramIcon(program.name);
  const colorClass = getProgramColor(program.name, program.is_custom);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-card border shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`flex items-center justify-between border-b px-6 py-4`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-base">{program.name}</h2>
              <p className="text-xs text-muted-foreground">{enrollees.length} enrolled member{enrollees.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Add Enrollee Form */}
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
                  <option>Coordinator</option>
                  <option>Volunteer</option>
                  <option>Beneficiary</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Date Enrolled *</label>
                <input type="date" required value={form.date_enrolled} onChange={(e) => setForm((f) => ({ ...f, date_enrolled: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Add Member"}
              </button>
            </div>
          </form>
        )}

        {/* Enrollee List */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-3 border-b">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Members & Beneficiaries</span>
            <button onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
              <UserPlus className="h-3.5 w-3.5" /> Add Member
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
          ) : enrollees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No members enrolled yet.</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-primary underline">Add the first member</button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-6 py-2.5">Name</th>
                  <th className="px-6 py-2.5">Role</th>
                  <th className="px-6 py-2.5">Purok</th>
                  <th className="px-6 py-2.5">Enrolled</th>
                  <th className="px-6 py-2.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {enrollees.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/40">
                    <td className="px-6 py-3 font-medium">{e.full_name}
                      {e.contact_number && <div className="text-xs text-muted-foreground">{e.contact_number}</div>}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{e.role || "Member"}</span>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">{e.purok || "—"}</td>
                    <td className="px-6 py-3 text-muted-foreground text-xs">{e.date_enrolled}</td>
                    <td className="px-6 py-3 text-right">
                      <button onClick={() => handleRemove(e.id)} disabled={isPending}
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

// ─── Create Program Modal ──────────────────────────────────────────────────────
function CreateProgramModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: BarangayProgram) => void }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    category: "Social Services",
    chairperson: "",
    contact: "",
    established_date: "",
    status: "Active",
    is_custom: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Program name is required."); return; }
    setSaving(true);
    setError("");
    try {
      const result = await createProgram(form as any);
      const newProg: BarangayProgram = { ...form, id: result.id, created_at: new Date().toISOString(), enrollee_count: 0 };
      onCreated(newProg);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create program.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-bold text-base flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />Create New Program</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">Program Name *</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Youth Leadership Council"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Code / Acronym</label>
                <input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. YLC"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option>Social Services</option>
                  <option>Peace & Order</option>
                  <option>Youth Development</option>
                  <option>Health & Wellness</option>
                  <option>Education</option>
                  <option>Anti-Drug</option>
                  <option>Women & Children</option>
                  <option>Senior Citizens</option>
                  <option>Livelihood</option>
                  <option>Environmental</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs font-semibold">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Brief program description…"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Chairperson</label>
                <input value={form.chairperson} onChange={(e) => setForm((f) => ({ ...f, chairperson: e.target.value }))}
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
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Creating…" : "Create Program"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Programs Client ─────────────────────────────────────────────────────
interface Props {
  initialPrograms: BarangayProgram[];
}

export function ProgramsClient({ initialPrograms }: Props) {
  const [programs, setPrograms] = useState<BarangayProgram[]>(initialPrograms);
  const [search, setSearch] = useState("");
  const [selectedProgram, setSelectedProgram] = useState<BarangayProgram | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filtered = programs.filter((p) =>
    `${p.name} ${p.code || ""} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleDelete(id: string, isCustom: boolean) {
    if (!isCustom) { alert("Built-in programs cannot be deleted."); return; }
    if (!confirm("Delete this custom program?")) return;
    startTransition(async () => {
      try {
        await deleteProgram(id);
        setPrograms((prev) => prev.filter((p) => p.id !== id));
      } catch {}
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BookOpen className="h-5 w-5" />
            </span>
            Programs & Councils
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage barangay programs, councils, and their enrolled members.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Program
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Programs", value: programs.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active", value: programs.filter((p) => p.status === "Active").length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Built-in", value: programs.filter((p) => !p.is_custom).length, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Custom", value: programs.filter((p) => p.is_custom).length, color: "text-amber-600", bg: "bg-amber-50" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl border p-4`}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            <p className={`mt-1 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search programs…"
          className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
      </div>

      {/* Program Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((program) => {
          const Icon = getProgramIcon(program.name);
          const colorClass = getProgramColor(program.name, program.is_custom);
          return (
            <div
              key={program.id}
              className="group relative rounded-2xl border bg-card p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => setSelectedProgram(program)}
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  {program.status === "Active" ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase">Active</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 uppercase">{program.status}</span>
                  )}
                  {program.is_custom && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(program.id, program.is_custom); }}
                      disabled={isPending}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <h3 className="font-bold text-base leading-tight">{program.name}</h3>
                {program.code && <p className="text-xs font-semibold text-muted-foreground mt-0.5">{program.code}</p>}
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{program.description || program.category}</p>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold">{program.enrollee_count ?? 0}</span> members
                </div>
                {program.chairperson && (
                  <span className="truncate max-w-[120px]">Chair: {program.chairperson}</span>
                )}
              </div>

              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight className="h-4 w-4 text-primary" />
              </div>
            </div>
          );
        })}

        {/* Add Program Card */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer min-h-[180px]"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted/60">
            <Plus className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold">Create New Program</p>
        </button>
      </div>

      {/* Enrollees Panel */}
      {selectedProgram && (
        <EnrolleesPanel
          program={selectedProgram}
          onClose={() => setSelectedProgram(null)}
        />
      )}

      {/* Create Program Modal */}
      {showCreateModal && (
        <CreateProgramModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(p) => setPrograms((prev) => [...prev, p])}
        />
      )}
    </div>
  );
}
