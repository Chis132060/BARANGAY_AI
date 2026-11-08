"use client";

import { useState } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { AdminTable } from "@/components/ui/AdminTable";
import type { OfficialItem } from "../../actions";
import type { ResidentListItem } from "../../../residents/actions";
import { OFFICIAL_POSITIONS, KAGAWAD_COMMITTEES } from "./OfficialCreateForm";

type UpdateInput = { resident_id: string; position: string; start_term: string; end_term?: string | null; status: "Active" | "Inactive" };

interface OfficialsTableProps {
  officials: OfficialItem[];
  residents: ResidentListItem[];
  onUpdate: (id: string, input: UpdateInput) => Promise<{ success: boolean }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
}

const inputClass = "mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm";
const labelClass = "block text-xs font-semibold text-muted-foreground";
const COMMITTEE_PREFIX = "Kagawad – Committee on ";

function splitPosition(position: string) {
  if (position.startsWith(COMMITTEE_PREFIX)) return { base: "Kagawad", committee: position.slice(COMMITTEE_PREFIX.length) };
  if ((OFFICIAL_POSITIONS as readonly string[]).includes(position)) return { base: position, committee: "" };
  // Legacy free-text positions (e.g. "Secretary") — keep as-is so nothing is lost
  return { base: position, committee: "" };
}

function formatDate(value?: string | null) {
  if (!value) return "Present";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

export function OfficialsTable({ officials, residents, onUpdate, onDelete }: OfficialsTableProps) {
  const [editing, setEditing] = useState<OfficialItem | null>(null);
  const [form, setForm] = useState({ resident_id: "", position: "", committee: "", start_term: "", end_term: "", status: "Active" as "Active" | "Inactive" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const verified = residents.filter((r) => r.verification_status === "Verified");
  const isKnownBase = (OFFICIAL_POSITIONS as readonly string[]).includes(form.position);

  function openEdit(off: OfficialItem) {
    const { base, committee } = splitPosition(off.position);
    setForm({ resident_id: off.resident_id, position: base, committee, start_term: off.start_term?.slice(0, 10) || "", end_term: off.end_term?.slice(0, 10) || "", status: off.status });
    setError("");
    setEditing(off);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (form.position === "Kagawad" && !form.committee) { setError("Select the committee this Kagawad chairs."); return; }
    if (form.end_term && form.end_term < form.start_term) { setError("End term cannot be before the start term."); return; }
    if ([form.start_term, form.end_term].some((d) => d && (d < "1900-01-01" || d > "2100-12-31"))) { setError("Please enter a valid year (1900–2100)."); return; }
    setSaving(true); setError("");
    try {
      const position = form.position === "Kagawad" ? `${COMMITTEE_PREFIX}${form.committee}` : form.position;
      await onUpdate(editing.id, { resident_id: form.resident_id, position, start_term: form.start_term, end_term: form.end_term || null, status: form.status });
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Unable to update official");
    } finally {
      setSaving(false);
    }
  }

  async function remove(off: OfficialItem) {
    const name = off.resident ? `${off.resident.first_name} ${off.resident.last_name}` : "this official";
    if (!window.confirm(`Remove ${name} (${off.position}) from the officials list? This cannot be undone.`)) return;
    setBusyId(off.id);
    try {
      await onDelete(off.id);
      window.location.reload();
    } catch (err: any) {
      window.alert(err.message || "Unable to remove official");
      setBusyId(null);
    }
  }

  return (
    <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
      <AdminTable className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <th className="px-6 py-4">Official Name</th>
            <th className="px-6 py-4">Position</th>
            <th className="px-6 py-4">Term Started</th>
            <th className="px-6 py-4">Term Ended</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border text-sm">
          {officials.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground font-medium">
                No active Barangay Officials registered.
              </td>
            </tr>
          ) : (
            officials.map((off) => (
              <tr key={off.id} className="hover:bg-muted/10 transition-colors">
                <td className="px-6 py-4 font-semibold text-foreground">
                  {off.resident ? `${off.resident.last_name}, ${off.resident.first_name}` : "—"}
                </td>
                <td className="px-6 py-4 text-muted-foreground font-medium">{off.position}</td>
                <td className="px-6 py-4 text-muted-foreground">{formatDate(off.start_term)}</td>
                <td className="px-6 py-4 text-muted-foreground">{formatDate(off.end_term)}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${off.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {off.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => openEdit(off)} aria-label="Edit official" title="Edit" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" disabled={busyId === off.id} onClick={() => remove(off)} aria-label="Remove official" title="Remove" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </AdminTable>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold">Edit Barangay Official</h2>
            {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <form onSubmit={save} className="space-y-4">
              <label className={labelClass}>
                Resident
                <select required value={form.resident_id} onChange={(e) => setForm({ ...form, resident_id: e.target.value })} className={inputClass}>
                  {!verified.some((r) => r.id === form.resident_id) && editing.resident && (
                    <option value={form.resident_id}>{editing.resident.first_name} {editing.resident.last_name}</option>
                  )}
                  {verified.map((r) => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Position
                <select required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value, committee: "" })} className={inputClass}>
                  {!isKnownBase && form.position && <option value={form.position}>{form.position}</option>}
                  {OFFICIAL_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              {form.position === "Kagawad" && (
                <label className={labelClass}>
                  Committee chaired
                  <select required value={form.committee} onChange={(e) => setForm({ ...form, committee: e.target.value })} className={inputClass}>
                    <option value="">Select committee</option>
                    {KAGAWAD_COMMITTEES.map((c) => <option key={c} value={c}>Committee on {c}</option>)}
                  </select>
                </label>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Start term
                  <input type="date" required min="1900-01-01" max="2100-12-31" value={form.start_term} onChange={(e) => setForm({ ...form, start_term: e.target.value })} className={inputClass} />
                </label>
                <label className={labelClass}>
                  End term (optional)
                  <input type="date" min={form.start_term || "1900-01-01"} max="2100-12-31" value={form.end_term} onChange={(e) => setForm({ ...form, end_term: e.target.value })} className={inputClass} />
                </label>
              </div>
              <label className={labelClass}>
                Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as "Active" | "Inactive" })} className={inputClass}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive (no longer in office)</option>
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button>
                <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
