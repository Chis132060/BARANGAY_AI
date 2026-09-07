"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

export function PurokCreateForm({ onCreate }: { onCreate: (name: string) => Promise<{ success: boolean }> }) {
  const [open, setOpen] = useState(false); const [name, setName] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setError(""); try { await onCreate(name); setOpen(false); setName(""); window.location.reload(); } catch (err: any) { setError(err.message || "Unable to create purok"); } finally { setLoading(false); } }
  return <div><button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Add Purok</button>{open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-2xl"><h2 className="text-lg font-bold">Add Purok</h2>{error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}<label className="block text-xs font-semibold text-muted-foreground">Purok name<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Purok 1" className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={loading} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{loading && <Loader2 className="h-4 w-4 animate-spin" />}Save purok</button></div></form></div>}</div>;
}
