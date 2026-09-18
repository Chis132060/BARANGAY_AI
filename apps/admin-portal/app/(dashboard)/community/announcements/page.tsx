"use client";

import { useEffect, useState } from "react";
import { Plus, Megaphone, Globe, Edit2, CheckCircle } from "lucide-react";
import { fetchAnnouncements, publishAnnouncement, Announcement } from "./actions";

const AUDIENCE_LABELS: Record<string, string> = {
  All: "All Residents",
  Residents: "Regular Residents",
  Senior: "Senior Citizens",
  "4Ps": "4Ps Beneficiaries",
};

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [current, setCurrent] = useState<Partial<Announcement>>({ title: "", body: "", target_audience: "All", status: "Published" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setItems(await fetchAnnouncements());
    setLoading(false);
  }

  const handleSave = async () => {
    if (!current.title || !current.body) return alert("Title and body required.");
    setSaving(true);
    try {
      await publishAnnouncement(
        current.id || null,
        current.title!,
        current.body!,
        current.target_audience || "All",
        current.status || "Published"
      );
      setIsOpen(false);
      load();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => {
    setCurrent({ title: "", body: "", target_audience: "All", status: "Published" });
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish community notices. Publishing sends a push notification to residents automatically.
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" /> Post Announcement
        </button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center text-muted-foreground">
            <Megaphone className="h-10 w-10 mb-3 opacity-40" />
            <p>No announcements posted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Audience</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {items.map((ann) => (
                  <tr key={ann.id} className="hover:bg-muted/10">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{ann.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{ann.body}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                        <Globe className="h-3 w-3" />
                        {AUDIENCE_LABELS[ann.target_audience] || ann.target_audience}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        ann.status === 'Published' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ann.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => { setCurrent(ann); setIsOpen(true); }}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg inline-flex"
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

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 border">
            <h3 className="font-bold text-lg border-b pb-2">{current.id ? "Edit Announcement" : "New Announcement"}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={current.title}
                  onChange={(e) => setCurrent({ ...current, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Community Clean-Up Drive"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Audience</label>
                  <select
                    value={current.target_audience}
                    onChange={(e) => setCurrent({ ...current, target_audience: e.target.value as any })}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Residents</option>
                    <option value="Senior">Senior Citizens</option>
                    <option value="4Ps">4Ps Beneficiaries</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={current.status}
                    onChange={(e) => setCurrent({ ...current, status: e.target.value as any })}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Draft">Save as Draft</option>
                    <option value="Published">Publish & Notify Residents</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Message</label>
                <textarea
                  rows={5}
                  value={current.body}
                  onChange={(e) => setCurrent({ ...current, body: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Announcement details..."
                />
              </div>

              {current.status === "Published" && (
                <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Saving as Published will trigger push notifications to all targeted residents.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm rounded-lg text-gray-600 hover:bg-gray-100">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : current.status === "Published" ? "Publish" : "Save Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
