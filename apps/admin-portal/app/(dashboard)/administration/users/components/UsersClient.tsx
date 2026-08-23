"use client";

import { useState } from "react";
import { Loader2, Search, Plus, Pencil, Trash2, X, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { updateSystemUser, deleteSystemUser } from "../../rbac-actions";
import type { SystemUser, RoleRecord } from "../../rbac-actions";

interface UsersClientProps {
  initialUsers: SystemUser[];
  initialRoles: RoleRecord[];
}

export function UsersClient({ initialUsers, initialRoles }: UsersClientProps) {
  const { role } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [roles] = useState<RoleRecord[]>(initialRoles);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", role_id: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function handleEdit(user: SystemUser) {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email, role_id: user.role_id });
    setShowEditModal(true);
  }

  async function handleSave() {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateSystemUser(editingUser.id, editForm);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                ...editForm,
                role: { name: roles.find((r) => r.id === editForm.role_id)?.name || "" },
              }
            : u
        )
      );
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteSystemUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <UsersIcon className="h-6 w-6 text-primary" />
            System Users
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage admin roles and system operators.</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">{filtered.length} user(s)</span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground font-medium">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                        <ShieldCheck className="h-3 w-3" />
                        {user.role?.name || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit user"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deleting === user.id}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          title="Delete user"
                        >
                          {deleting === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <Pencil className="h-5 w-5 text-primary" />
                Edit User
              </div>
              <button
                onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Role</label>
                <select
                  value={editForm.role_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, role_id: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-accent border border-border text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
