"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import type { ResidentListItem } from "../../../residents/actions";

interface Props {
  residents: ResidentListItem[];
  onCreate: (input: { resident_id: string; position: string; start_term: string; end_term?: string }) => Promise<{ success: boolean }>;
}

export function OfficialCreateForm({ residents, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ resident_id: "", position: "Barangay Official", start_term: new Date().toISOString().slice(0, 10), end_term: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError("");
    try { await onCreate(form); setOpen(false); setForm((current) => ({ ...current, resident_id: "", end_term: "" })); window.location.reload(); }
    catch (err: any) { setError(err.message || "Unable to create official record"); }
    finally { setLoading(false); }
  }

  return <div>
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95"><Plus className="h-4 w-4" /> Add Official</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl"><h2 className="mb-4 text-lg font-bold">Add Barangay Official</h2>{error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}<form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-muted-foreground">Resident<select required value={form.resident_id} onChange={(event) => setForm({ ...form, resident_id: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"><option value="">Select verified resident</option>{residents.filter((resident) => resident.verification_status === "Verified").map((resident) => <option key={resident.id} value={resident.id}>{resident.first_name} {resident.last_name}</option>)}</select></label><label className="block text-xs font-semibold text-muted-foreground">Position<input required value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-muted-foreground">Start term<input type="date" required value={form.start_term} onChange={(event) => setForm({ ...form, start_term: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label><label className="block text-xs font-semibold text-muted-foreground">End term (optional)<input type="date" value={form.end_term} onChange={(event) => setForm({ ...form, end_term: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={loading || residents.filter((resident) => resident.verification_status === "Verified").length === 0} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{loading && <Loader2 className="h-4 w-4 animate-spin" />}Save official</button></div></form></div></div>}
  </div>;
}
