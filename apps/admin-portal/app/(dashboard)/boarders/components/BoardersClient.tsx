"use client";

import { useState, useTransition } from "react";
import {
  Users,
  Plus,
  Search,
  Home,
  Phone,
  User,
  Calendar,
  MapPin,
  Trash2,
  X,
  Save,
  DollarSign,
} from "lucide-react";
import { BoarderListItem, createBoarder, deleteBoarder, updateBoarderStatus } from "../actions";

function getStatusColor(status: string) {
  if (status === "Active") return "bg-emerald-100 text-emerald-800";
  if (status === "Inactive") return "bg-gray-100 text-gray-600";
  if (status === "Left") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

const EMPTY_FORM = {
  first_name: "",
  middle_name: "",
  last_name: "",
  birth_date: "",
  gender: "Male",
  civil_status: "Single",
  contact_number: "",
  id_type: "",
  landlord_name: "",
  landlord_contact: "",
  property_address: "",
  purok: "",
  monthly_rent: undefined as number | undefined,
  move_in_date: "",
  status: "Active",
};

interface Props {
  initialBoarders: BoarderListItem[];
}

export function BoardersClient({ initialBoarders }: Props) {
  const [boarders, setBoarders] = useState<BoarderListItem[]>(initialBoarders);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = boarders.filter(
    (b) =>
      `${b.first_name} ${b.last_name} ${b.landlord_name || ""}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  function openModal() {
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.birth_date) {
      setError("First name, last name, and birth date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await createBoarder(form as any);
      const newBoarder: BoarderListItem = {
        ...form,
        id: result.id,
        created_at: new Date().toISOString(),
      };
      setBoarders((prev) => [newBoarder, ...prev]);
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to save boarder.");
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this boarder record?")) return;
    startTransition(async () => {
      try {
        await deleteBoarder(id);
        setBoarders((prev) => prev.filter((b) => b.id !== id));
      } catch {}
    });
  }

  function ageOf(birthDate: string) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (
      today.getMonth() < birth.getMonth() ||
      (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
    )
      age -= 1;
    return age;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Home className="h-5 w-5" />
            </span>
            Boarders Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registry of boarders and renters within the barangay.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Boarder
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total Boarders", value: boarders.length, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Active", value: boarders.filter((b) => b.status === "Active").length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Inactive / Left", value: boarders.filter((b) => b.status !== "Active").length, color: "text-gray-600", bg: "bg-gray-50" },
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or landlord…"
          className="w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3">Boarder</th>
                <th className="px-6 py-3">Age / Gender</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Landlord</th>
                <th className="px-6 py-3">Purok</th>
                <th className="px-6 py-3">Monthly Rent</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    No boarder records found.
                  </td>
                </tr>
              )}
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{b.first_name} {b.middle_name ? b.middle_name[0] + ". " : ""}{b.last_name}</div>
                    <div className="text-xs text-muted-foreground">{b.id_type || "No ID type"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold">{b.birth_date ? ageOf(b.birth_date) : "—"} yrs</span>
                    <span className="ml-1 text-muted-foreground">{b.gender}</span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{b.contact_number || "N/A"}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{b.landlord_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{b.landlord_contact || ""}</div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">{b.purok || "—"}</td>
                  <td className="px-6 py-4">
                    {b.monthly_rent ? (
                      <span className="font-semibold text-emerald-700">₱{Number(b.monthly_rent).toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={isPending}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Boarder Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-card border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-bold">Add New Boarder</h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto">
              <div className="p-6 space-y-5">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                {/* Personal Info */}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> Personal Information
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold">First Name *</label>
                      <input required value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Middle Name</label>
                      <input value={form.middle_name} onChange={(e) => setForm((f) => ({ ...f, middle_name: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Last Name *</label>
                      <input required value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Birth Date *</label>
                      <input type="date" required value={form.birth_date} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Gender</label>
                      <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Civil Status</label>
                      <select value={form.civil_status} onChange={(e) => setForm((f) => ({ ...f, civil_status: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                        <option>Single</option>
                        <option>Married</option>
                        <option>Widowed</option>
                        <option>Divorced</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Contact Number</label>
                      <input value={form.contact_number} onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
                        placeholder="09XXXXXXXXX"
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">ID Type</label>
                      <select value={form.id_type} onChange={(e) => setForm((f) => ({ ...f, id_type: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                        <option value="">— Select ID —</option>
                        <option>PhilSys / National ID</option>
                        <option>Passport</option>
                        <option>Driver's License</option>
                        <option>SSS</option>
                        <option>GSIS</option>
                        <option>UMID</option>
                        <option>Voter's ID</option>
                        <option>School ID</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Landlord / Property Info */}
                <div>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Home className="h-3.5 w-3.5" /> Landlord & Property Information
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Landlord Name</label>
                      <input value={form.landlord_name} onChange={(e) => setForm((f) => ({ ...f, landlord_name: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Landlord Contact</label>
                      <input value={form.landlord_contact} onChange={(e) => setForm((f) => ({ ...f, landlord_contact: e.target.value }))}
                        placeholder="09XXXXXXXXX"
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs font-semibold">Property Address</label>
                      <input value={form.property_address} onChange={(e) => setForm((f) => ({ ...f, property_address: e.target.value }))}
                        placeholder="House No., Street"
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Purok</label>
                      <input value={form.purok} onChange={(e) => setForm((f) => ({ ...f, purok: e.target.value }))}
                        placeholder="e.g. Purok 3"
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Monthly Rent (₱)</label>
                      <input type="number" min="0" value={form.monthly_rent ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, monthly_rent: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Move-In Date</label>
                      <input type="date" value={form.move_in_date} onChange={(e) => setForm((f) => ({ ...f, move_in_date: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold">Status</label>
                      <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                        className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                        <option>Active</option>
                        <option>Inactive</option>
                        <option>Left</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t px-6 py-4">
                <button type="button" onClick={() => setShowModal(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Boarder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
