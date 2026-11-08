"use client";

import { useState } from "react";
import { Loader2, MapPin, Pencil, Trash2 } from "lucide-react";
import { AdminTable } from "@/components/ui/AdminTable";

interface Precinct { id: string; number: string; location?: string }

interface Props {
  precincts: Precinct[];
  onUpdate: (id: string, number: string, location?: string) => Promise<{ success: boolean }>;
  onDelete: (id: string) => Promise<{ success: boolean }>;
}

export function PrecinctTable({ precincts, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<Precinct | null>(null);
  const [number, setNumber] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openEdit(p: Precinct) {
    setEditing(p); setNumber(p.number); setLocation(p.location || ""); setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true); setError("");
    try { await onUpdate(editing.id, number, location); window.location.reload(); }
    catch (err: any) { setError(err.message || "Unable to update precinct"); }
    finally { setSaving(false); }
  }

  async function remove(p: Precinct) {
    if (!window.confirm(`Delete precinct ${p.number}? This cannot be undone.`)) return;
    setBusyId(p.id);
    try { await onDelete(p.id); window.location.reload(); }
    catch (err: any) { window.alert(err.message || "Unable to delete precinct"); setBusyId(null); }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <AdminTable className="w-full text-left text-sm">
        <thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
          <tr>
            <th className="px-6 py-3">Precinct No.</th>
            <th className="px-6 py-3">Polling Location</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {precincts.map((item) => (
            <tr key={item.id}>
              <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{item.number}</td>
              <td className="px-6 py-4">
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{item.location || "Location not recorded"}</span>
              </td>
              <td className="px-6 py-4">
                <div className="flex justify-end gap-1">
                  <button type="button" onClick={() => openEdit(item)} aria-label="Edit precinct" title="Edit" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={busyId === item.id} onClick={() => remove(item)} aria-label="Delete precinct" title="Delete" className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={save} className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-6 shadow-2xl">
            <h2 className="text-lg font-bold">Edit Precinct</h2>
            {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <label className="block text-xs font-semibold text-muted-foreground">
              Precinct number
              <input required value={number} onChange={(e) => setNumber(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-muted-foreground">
              Polling location
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button>
              <button disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

