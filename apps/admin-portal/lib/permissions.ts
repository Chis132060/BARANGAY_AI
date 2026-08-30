import { createClient } from "@/lib/supabase/client";

export type UserRole = "Super Admin" | "Barangay Captain" | "Secretary" | "Treasurer" | "Staff";

export interface PermissionSet {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

// ─── Client-side permission cache ───────────────────────────────────────────

let cachedPermissions: Record<string, PermissionSet> | null = null;
let cachedRoleId: string | null = null;

const DEFAULT_DENY: PermissionSet = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
};

/**
 * Fetch the current user's permissions from the database.
 * Results are cached per role_id to avoid repeated queries.
 */
export async function fetchUserPermissions(roleId: string): Promise<Record<string, PermissionSet>> {
  if (cachedRoleId === roleId && cachedPermissions) {
    return cachedPermissions;
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("permissions")
    .select("module, can_view, can_create, can_edit, can_delete, can_approve")
    .eq("role_id", roleId);

  if (!data) return {};

  const result: Record<string, PermissionSet> = {};
  for (const p of data) {
    result[p.module] = {
      canView: p.can_view,
      canCreate: p.can_create,
      canEdit: p.can_edit,
      canDelete: p.can_delete,
      canApprove: p.can_approve,
    };
  }

  cachedPermissions = result;
  cachedRoleId = roleId;
  return result;
}

/**
 * Check if the current user's role has a specific permission for a module.
 * Uses cached permissions if available.
 */
export function checkPermissions(
  role: string | null | undefined,
  module: string,
  permissions?: Record<string, PermissionSet>
): PermissionSet {
  if (!role) return DEFAULT_DENY;

  // Use provided permissions map (from auth context) or cached
  const permsMap = permissions || cachedPermissions;
  if (!permsMap) return DEFAULT_DENY;

  // Super Admin wildcard
  if (permsMap["*"]) return permsMap["*"];

  return permsMap[module] || DEFAULT_DENY;
}

/**
 * Check a specific action on a module.
 */
export function hasPermission(
  role: string | null | undefined,
  module: string,
  action: keyof PermissionSet,
  permissions?: Record<string, PermissionSet>
): boolean {
  return checkPermissions(role, module, permissions)[action];
}

/**
 * Clear the permission cache (e.g., on logout or role change).
 */
export function clearPermissionCache(): void {
  cachedPermissions = null;
  cachedRoleId = null;
}

/**
 * Get all available modules from the permissions table.
 */
export async function fetchAvailableModules(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("permissions")
    .select("module")
    .order("module");

  if (!data) return [];
  const modules = [...new Set(data.map((p: { module: string }) => p.module))] as string[];
  return modules.filter((m) => m !== "*");
}
