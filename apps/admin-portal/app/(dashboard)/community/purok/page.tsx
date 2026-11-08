"use client";

import { useEffect, useState } from "react";
import { Building2, Plus, MapPin, Users, Home, Edit2, RefreshCw, Trash2 } from "lucide-react";
import { fetchPurokStats, savePurok, deletePurok, PurokStats } from "../actions";
import { fetchResidents, type ResidentListItem } from "../../residents/actions";

export default function PurokPage() {
  const [puroks, setPuroks] = useState<PurokStats[]>([]);
  const [residents, setResidents] = useState<ResidentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<{ id?: string; name: string; leaderId: string }>({ name: "", leaderId: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [data, residentList] = await Promise.all([fetchPurokStats(), fetchResidents().catch(() => [] as ResidentListItem[])]);
    setPuroks(data);
    setResidents(residentList);
    setLoading(false);
  }

  const handleSave = async () => {
    if (!current.name) return alert("Purok name is required.");
    setSaving(true);
    try {
      const leader = residents.find((r) => r.id === current.leaderId);
      const leaderName = leader ? `${leader.first_name} ${leader.last_name}` : null;
      await savePurok(current.id || null, current.name, current.leaderId || null, leaderName);
      setIsOpen(false);
      load();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: PurokStats) => {
    if (!window.confirm(`Delete ${p.name}? This cannot be undone.`)) return;
    try {
      await deletePurok(p.purok_id);
      load();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openNew = () => {
    setCurrent({ name: "", leaderId: "" });
    setIsOpen(true);
  };

  const openEdit = (p: PurokStats) => {
    setCurrent({ id: p.purok_id, name: p.name, leaderId: p.leader_id || "" });
    setIsOpen(true);
  };

  const totalResidents = puroks.reduce((s, p) => s + p.resident_count, 0);
  const totalHouseholds = puroks.reduce((s, p) => s + p.household_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purok Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Territorial purok assignments, leaders, and live demographic counts from the database.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-lg border bg-card hover:bg-muted transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : "text-muted-foreground"}`} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow-xs hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Add Purok
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      {!loading && puroks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-xl bg-card p-4 text-center shadow-xs">
            <p className="text-xs text-muted-foreground font-medium">Total Puroks</p>
            <p className="text-3xl font-extrabold text-primary mt-1">{puroks.length}</p>
          </div>
          <div className="border rounded-xl bg-card p-4 text-center shadow-xs">
            <p className="text-xs text-muted-foreground font-medium">Total Households</p>
            <p className="text-3xl font-extrabold text-blue-600 mt-1">{totalHouseholds.toLocaleString()}</p>
          </div>
          <div className="border rounded-xl bg-card p-4 text-center shadow-xs">
            <p className="text-xs text-muted-foreground font-medium">Total Residents</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">{totalResidents.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Purok Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Loading purok data...</div>
      ) : puroks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-muted p-12 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-muted-foreground">No puroks configured yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create puroks here to enable mapping via the Phase 1 migration.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {puroks.map((purok) => (
            <div key={purok.purok_id} className="border rounded-2xl bg-card p-5 space-y-4 shadow-xs hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-extrabold">{purok.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(purok)}
                    aria-label={`Edit ${purok.name}`}
                    title="Edit"
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(purok)}
                    aria-label={`Delete ${purok.name}`}
                    title="Delete"
                    className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  President:{" "}
                  <span className="font-semibold text-foreground">
                    {purok.leader_name || purok.president_name || "— Unassigned —"}
                  </span>
                </p>
              </div>

              <div className="pt-3 border-t grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <Home className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-blue-700">{purok.household_count}</p>
                  <p className="text-[10px] text-blue-600 font-medium">Households</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <Users className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-emerald-700">{purok.resident_count}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">Residents</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border">
            <h3 className="font-bold text-lg border-b pb-3">
              {current.id ? "Edit Purok" : "Add New Purok"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Purok Name</label>
                <input
                  type="text"
                  value={current.name}
                  onChange={(e) => setCurrent({ ...current, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Purok 4 - Dahlia"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Purok President <span className="font-normal text-gray-400">(Optional)</span>
                </label>
                <select
                  value={current.leaderId}
                  onChange={(e) => setCurrent({ ...current, leaderId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Select verified resident —</option>
                  {residents
                    .filter((r) => r.verification_status === "Verified")
                    .map((r) => (
                      <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setIsOpen(false)} className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saving..." : current.id ? "Update" : "Create Purok"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
