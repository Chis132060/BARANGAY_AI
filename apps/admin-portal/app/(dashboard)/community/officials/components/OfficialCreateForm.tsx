"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { ResidentListItem } from "../../../residents/actions";

export const OFFICIAL_POSITIONS = [
  "Punong Barangay",
  "Kagawad",
  "SK Chairperson",
  "Barangay Secretary",
  "Barangay Treasurer",
] as const;

export const KAGAWAD_COMMITTEES = [
  "Peace and Order",
  "Health and Sanitation",
  "Education",
  "Infrastructure",
  "Budget and Finance",
  "Livelihood and Agriculture",
  "Sports and Youth Development",
  "Environmental Protection",
  "Women and Family",
] as const;

const MAX_KAGAWADS = 7;

interface ExistingOfficial {
  position: string;
  status: string;
}

interface Props {
  residents: ResidentListItem[];
  officials?: ExistingOfficial[];
  onCreate: (input: { resident_id: string; position: string; start_term: string; end_term?: string }) => Promise<{ success: boolean }>;
}

const inputClass = "mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm";
const labelClass = "block text-xs font-semibold text-muted-foreground";

export function OfficialCreateForm({ residents, officials = [], onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    resident_id: "",
    position: "Kagawad" as string,
    committee: "",
    start_term: new Date().toISOString().slice(0, 10),
    end_term: "",
  });

  const verifiedResidents = residents.filter((resident) => resident.verification_status === "Verified");
  const active = officials.filter((o) => o.status === "Active");
  const kagawadCount = active.filter((o) => o.position.startsWith("Kagawad")).length;
  const hasCaptain = active.some((o) => o.position === "Punong Barangay");
  const isKagawad = form.position === "Kagawad";

  function validate() {
    if (form.position === "Punong Barangay" && hasCaptain) return "There is already an active Punong Barangay. End that term first.";
    if (isKagawad && kagawadCount >= MAX_KAGAWADS) return `A barangay can only have ${MAX_KAGAWADS} Kagawads. End an existing term first.`;
    if (isKagawad && !form.committee) return "Select the committee this Kagawad chairs.";
    if (form.end_term && form.end_term < form.start_term) return "End term cannot be before the start term.";
    if ([form.start_term, form.end_term].some((d) => d && (d < "1900-01-01" || d > "2100-12-31"))) return "Please enter a valid year (1900–2100).";
    return "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); return; }
    setLoading(true); setError("");
    try {
      const position = isKagawad ? `Kagawad – Committee on ${form.committee}` : form.position;
      await onCreate({ resident_id: form.resident_id, position, start_term: form.start_term, end_term: form.end_term || undefined });
      setOpen(false);
      setForm((current) => ({ ...current, resident_id: "", committee: "", end_term: "" }));
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Unable to create official record");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={() => { setOpen(true); setError(""); }} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95">
        <Plus className="h-4 w-4" /> Add Official
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold">Add Barangay Official</h2>
            {error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <form onSubmit={submit} className="space-y-4">
              <label className={labelClass}>
                Resident
                <select required value={form.resident_id} onChange={(e) => setForm({ ...form, resident_id: e.target.value })} className={inputClass}>
                  <option value="">Select verified resident</option>
                  {verifiedResidents.map((resident) => (
                    <option key={resident.id} value={resident.id}>{resident.first_name} {resident.last_name}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Position
                <select required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value, committee: "" })} className={inputClass}>
                  {OFFICIAL_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
                {isKagawad && <span className="mt-1 block text-[11px] font-normal">Kagawads filled: {kagawadCount} of {MAX_KAGAWADS}</span>}
              </label>
              {isKagawad && (
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
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button>
                <button disabled={loading || verifiedResidents.length === 0} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}Save official
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
