"use client";

import { useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  Shield,
  Users,
  Check,
  ChevronDown,
  ChevronRight,
  Save,
} from "lucide-react";
import {
  createRole,
  updateRole,
  deleteRole,
  upsertPermissions,
} from "../../rbac-actions";
import type { RoleWithPermissions, PermissionRecord } from "../../rbac-actions";

const MODULES = [
  "dashboard",
  "residents",
  "documents",
  "community",
  "cases",
  "business",
  "communication",
  "administration",
];

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  residents: "Residents Management",
  documents: "Documents & Services",
  community: "Community Management",
  cases: "Cases & Reports",
  business: "Business Management",
  communication: "Communication & Transactions",
  administration: "Administration",
};

const ACTIONS = ["can_view", "can_create", "can_edit", "can_delete", "can_approve"] as const;

const ACTION_LABELS: Record<string, string> = {
  can_view: "View",
  can_create: "Create",
  can_edit: "Edit",
  can_delete: "Delete",
  can_approve: "Approve",
};

interface RolesClientProps {
  initialRoles: RoleWithPermissions[];
}

export function RolesClient({ initialRoles }: RolesClientProps) {
  const [roles, setRoles] = useState<RoleWithPermissions[]>(initialRoles);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});
  const [permEdits, setPermEdits] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function toggleExpand(roleId: string) {
    setExpandedRoles((prev) => ({ ...prev, [roleId]: !prev[roleId] }));
  }

  async function handleCreateRole() {
    if (!newRoleName.trim()) return;
    setSaving(true);
    try {
      const created = await createRole(newRoleName.trim());
      setRoles((prev) => [...prev, { ...created, permissions: [], user_count: 0 }]);
      setShowCreateModal(false);
      setNewRoleName("");
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRole(id: string, name: string) {
    if (!confirm(`Delete role "${name}"? This will remove all its permissions.`)) return;
    setDeleting(id);
    try {
      await deleteRole(id);
      setRoles((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(null);
    }
  }

  function openPermEditor(role: RoleWithPermissions) {
    setEditingRole(role);
    // Build current permissions map
    const edits: Record<string, Record<string, boolean>> = {};
    for (const mod of MODULES) {
      const existing = role.permissions.find((p) => p.module === mod);
      edits[mod] = {
        can_view: existing?.can_view ?? false,
        can_create: existing?.can_create ?? false,
        can_edit: existing?.can_edit ?? false,
        can_delete: existing?.can_delete ?? false,
        can_approve: existing?.can_approve ?? false,
      };
    }
    setPermEdits(edits);
    setShowPermModal(true);
  }

  function togglePerm(module: string, action: string) {
    setPermEdits((prev) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action],
      },
    }));
  }

  function setAllModulePerms(module: string, value: boolean) {
    setPermEdits((prev) => ({
      ...prev,
      [module]: {
        can_view: value,
        can_create: value,
        can_edit: value,
        can_delete: value,
        can_approve: value,
      },
    }));
  }

  async function handleSavePermissions() {
    if (!editingRole) return;
    setSaving(true);
    try {
      const perms: Omit<PermissionRecord, "id" | "role_id">[] = MODULES.map((mod) => ({
        module: mod,
        can_view: permEdits[mod]?.can_view ?? false,
        can_create: permEdits[mod]?.can_create ?? false,
        can_edit: permEdits[mod]?.can_edit ?? false,
        can_delete: permEdits[mod]?.can_delete ?? false,
        can_approve: permEdits[mod]?.can_approve ?? false,
      }));

      await upsertPermissions(editingRole.id, perms);

      // Update local state
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingRole.id
            ? {
                ...r,
                permissions: perms.map((p, i) => ({
                  id: `perm-${r.id}-${i}`,
                  role_id: r.id,
                  ...p,
                })),
              }
            : r
        )
      );
      setShowPermModal(false);
      setEditingRole(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Roles & Permissions
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure role-based access control (RBAC) rules dynamically from the database.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-primary/20 hover:bg-primary/95 transition-all"
        >
          <Plus className="h-4 w-4" /> Create Role
        </button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((r) => (
          <div key={r.id} className="border rounded-2xl bg-card p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Shield className="h-5 w-5" />
                <h3>{r.name}</h3>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {r.user_count || 0} Users
                </span>
                <button
                  onClick={() => openPermEditor(r)}
                  className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit permissions"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteRole(r.id, r.name)}
                  disabled={deleting === r.id}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  title="Delete role"
                >
                  {deleting === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable permissions summary */}
            <button
              onClick={() => toggleExpand(r.id)}
              className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {expandedRoles[r.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {r.permissions.length} module(s) configured
            </button>

            {expandedRoles[r.id] && (
              <div className="space-y-1 pt-1">
                {r.permissions.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-[10px]">
                    <span className="font-semibold text-foreground w-28">{MODULE_LABELS[p.module] || p.module}</span>
                    <div className="flex gap-1">
                      {ACTIONS.map((a) => (
                        <span
                          key={a}
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            (p as any)[a]
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground/50"
                          }`}
                        >
                          {ACTION_LABELS[a]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <Plus className="h-5 w-5 text-primary" />
                Create New Role
              </div>
              <button
                onClick={() => { setShowCreateModal(false); setNewRoleName(""); }}
                className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Role Name</label>
              <input
                type="text"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Health Officer"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && handleCreateRole()}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setShowCreateModal(false); setNewRoleName(""); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-accent border border-border text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRole}
                disabled={saving || !newRoleName.trim()}
                className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Editor Modal */}
      {showPermModal && editingRole && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-4xl max-h-[85vh] rounded-2xl p-6 space-y-4 shadow-2xl border overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <Shield className="h-5 w-5 text-primary" />
                Edit Permissions: {editingRole.name}
              </div>
              <button
                onClick={() => { setShowPermModal(false); setEditingRole(null); }}
                className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-muted/30 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 sticky left-0 bg-card">Module</th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="px-4 py-3 text-center">{ACTION_LABELS[a]}</th>
                    ))}
                    <th className="px-4 py-3 text-center">All</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {MODULES.map((mod) => (
                    <tr key={mod} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground sticky left-0 bg-card">
                        {MODULE_LABELS[mod]}
                      </td>
                      {ACTIONS.map((a) => (
                        <td key={a} className="px-4 py-3 text-center">
                          <button
                            onClick={() => togglePerm(mod, a)}
                            className={`mx-auto w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                              permEdits[mod]?.[a]
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground/30 hover:bg-muted/80"
                            }`}
                          >
                            {permEdits[mod]?.[a] && <Check className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            const allOn = ACTIONS.every((a) => permEdits[mod]?.[a]);
                            setAllModulePerms(mod, !allOn);
                          }}
                          className={`mx-auto px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                            ACTIONS.every((a) => permEdits[mod]?.[a])
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {ACTIONS.every((a) => permEdits[mod]?.[a]) ? "All On" : "All Off"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t shrink-0">
              <button
                onClick={() => { setShowPermModal(false); setEditingRole(null); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-accent border border-border text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
