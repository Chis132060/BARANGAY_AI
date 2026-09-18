"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, CheckCircle, BookOpen, AlertCircle, FileText } from "lucide-react";
import { fetchPolicies, savePolicy, BarangayPolicy } from "./actions";
import { createClient } from "@/lib/supabase/client";

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<BarangayPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPolicy, setCurrentPolicy] = useState<Partial<BarangayPolicy>>({ title: "", content: "", status: "Draft" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    setLoading(true);
    const data = await fetchPolicies();
    setPolicies(data);
    setLoading(false);
  }

  const handleSave = async () => {
    if (!currentPolicy.title || !currentPolicy.content) return alert("Title and content required");
    setSaving(true);
    try {
      await savePolicy(currentPolicy.id || null, currentPolicy.title, currentPolicy.content, currentPolicy.status as any);
      setIsModalOpen(false);
      loadPolicies();
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditor = (policy?: BarangayPolicy) => {
    if (policy) {
      setCurrentPolicy(policy);
    } else {
      setCurrentPolicy({ title: "", content: "", status: "Draft" });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barangay Policies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage local ordinances, guidelines, and rules. Drafts are hidden from the resident AI.
          </p>
        </div>
        <button
          onClick={() => openEditor()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-xs"
        >
          <Plus className="h-4 w-4" /> New Policy
        </button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading policies...</div>
        ) : policies.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p>No policies defined yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Updated</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {policies.map((pol) => (
                  <tr key={pol.id} className="hover:bg-muted/10">
                    <td className="px-6 py-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        {pol.title}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        pol.status === 'Published' ? 'bg-emerald-100 text-emerald-800' :
                        pol.status === 'Draft' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pol.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(pol.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditor(pol)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors inline-flex"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 border">
            <h3 className="font-bold text-lg text-gray-900 border-b pb-2">
              {currentPolicy.id ? "Edit Policy" : "New Policy"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={currentPolicy.title}
                  onChange={(e) => setCurrentPolicy({ ...currentPolicy, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Curfew Ordinance 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                <select
                  value={currentPolicy.status}
                  onChange={(e) => setCurrentPolicy({ ...currentPolicy, status: e.target.value as any })}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Draft">Draft (Internal Only - Not in AI RAG)</option>
                  <option value="Published">Published (Live & Indexed by AI)</option>
                  <option value="Archived">Archived</option>
                </select>
                {currentPolicy.status === "Published" && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Publishing makes this policy queryable by residents via Ate Sora.
                  </p>
                )}
                {currentPolicy.status === "Draft" && (
                  <p className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Drafts are hidden from the resident app and AI.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Content</label>
                <textarea
                  rows={8}
                  value={currentPolicy.content}
                  onChange={(e) => setCurrentPolicy({ ...currentPolicy, content: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                  placeholder="Policy content..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Policy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
