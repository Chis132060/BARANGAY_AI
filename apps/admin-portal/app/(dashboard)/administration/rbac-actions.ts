"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RoleRecord {
  id: string;
  name: string;
}

export interface PermissionRecord {
  id: string;
  role_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
}

export interface PermissionSet {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface RoleWithPermissions extends RoleRecord {
  permissions: PermissionRecord[];
  user_count?: number;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role_id: string;
  created_at: string;
  updated_at: string;
  role?: { name: string };
}

// ─── Role CRUD ──────────────────────────────────────────────────────────────

export async function fetchRoles(): Promise<RoleRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name")
    .order("name");

  if (error) throw new Error(error.message);
  return (data || []) as RoleRecord[];
}

export async function fetchRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  const supabase = createClient();

  const { data: roles, error: rolesErr } = await supabase
    .from("roles")
    .select("id, name")
    .order("name");

  if (rolesErr) throw new Error(rolesErr.message);

  const { data: permissions, error: permsErr } = await supabase
    .from("permissions")
    .select("*");

  if (permsErr) throw new Error(permsErr.message);

  // Count users per role
  const { data: users } = await supabase
    .from("users")
    .select("role_id");

  const userCounts: Record<string, number> = {};
  if (users) {
    for (const u of users as any[]) {
      if (u.role_id) {
        userCounts[u.role_id] = (userCounts[u.role_id] || 0) + 1;
      }
    }
  }

  const permMap: Record<string, PermissionRecord[]> = {};
  for (const p of (permissions || []) as PermissionRecord[]) {
    if (!permMap[p.role_id]) permMap[p.role_id] = [];
    permMap[p.role_id].push(p);
  }

  return ((roles || []) as RoleRecord[]).map((r) => ({
    ...r,
    permissions: permMap[r.id] || [],
    user_count: userCounts[r.id] || 0,
  }));
}

export async function createRole(name: string): Promise<RoleRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("roles")
    .insert({ name })
    .select("id, name")
    .single();

  if (error) throw new Error(error.message);

  // Write audit log
  await writeAuditLog("CREATE", "administration", `Created role: ${name}`);

  return data as RoleRecord;
}

export async function updateRole(id: string, name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("roles")
    .update({ name })
    .eq("id", id);

  if (error) throw new Error(error.message);
  await writeAuditLog("UPDATE", "administration", `Updated role: ${name}`);
}

export async function deleteRole(id: string): Promise<void> {
  const supabase = createClient();
  // Delete associated permissions first
  await supabase.from("permissions").delete().eq("role_id", id);
  const { error } = await supabase.from("roles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog("DELETE", "administration", `Deleted role ${id}`);
}

// ─── Permission CRUD ────────────────────────────────────────────────────────

export async function fetchPermissionsByRole(roleId: string): Promise<PermissionRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .eq("role_id", roleId);

  if (error) throw new Error(error.message);
  return (data || []) as PermissionRecord[];
}

export async function upsertPermissions(roleId: string, permissions: Omit<PermissionRecord, "id" | "role_id">[]): Promise<void> {
  const supabase = createClient();

  // Delete existing permissions for this role, then insert new ones
  await supabase.from("permissions").delete().eq("role_id", roleId);

  const rows = permissions.map((p) => ({
    role_id: roleId,
    module: p.module,
    can_view: p.can_view,
    can_create: p.can_create,
    can_edit: p.can_edit,
    can_delete: p.can_delete,
    can_approve: p.can_approve,
  }));

  const { error } = await supabase.from("permissions").insert(rows);
  if (error) throw new Error(error.message);

  await writeAuditLog("UPDATE", "administration", `Updated permissions for role ${roleId}`);
}

// ─── User CRUD ──────────────────────────────────────────────────────────────

export async function fetchSystemUsers(): Promise<SystemUser[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      name,
      email,
      role_id,
      created_at,
      updated_at,
      role:roles(name)
    `)
    .order("name");

  if (error) throw new Error(error.message);
  return (data || []) as SystemUser[];
}

export async function fetchSystemUser(id: string): Promise<SystemUser | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("users")
    .select(`
      id,
      name,
      email,
      role_id,
      created_at,
      updated_at,
      role:roles(name)
    `)
    .eq("id", id)
    .single();

  if (error) return null;
  return data as SystemUser;
}

export async function updateSystemUser(id: string, updates: { name?: string; email?: string; role_id?: string }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  await writeAuditLog("UPDATE", "administration", `Updated user ${id}`);
}

export async function deleteSystemUser(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog("DELETE", "administration", `Deleted user ${id}`);
}

// ─── Permission Check (server-side) ─────────────────────────────────────────

export async function getPermissionsForUser(userId: string): Promise<Record<string, PermissionSet>> {
  const supabase = createClient();

  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("role_id")
    .eq("id", userId)
    .single();

  if (userErr || !user) return {};

  const { data: permissions } = await supabase
    .from("permissions")
    .select("*")
    .eq("role_id", user.role_id);

  if (!permissions) return {};

  const result: Record<string, PermissionSet> = {};
  for (const p of permissions as PermissionRecord[]) {
    result[p.module] = {
      canView: p.can_view,
      canCreate: p.can_create,
      canEdit: p.can_edit,
      canDelete: p.can_delete,
      canApprove: p.can_approve,
    };
  }
  return result;
}

export async function checkUserPermission(
  userId: string,
  module: string,
  action: keyof PermissionSet
): Promise<boolean> {
  const perms = await getPermissionsForUser(userId);
  // Super Admin wildcard
  if (perms["*"]) return true;
  return perms[module]?.[action] ?? false;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function writeAuditLog(action: string, module: string, description?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action,
      module,
    });
  }
}
