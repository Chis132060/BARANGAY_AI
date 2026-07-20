export type UserRole = "Super Admin" | "Barangay Captain" | "Secretary" | "Treasurer" | "Staff";

export interface PermissionSet {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, Record<string, PermissionSet>> = {
  "Super Admin": {
    "*": { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
  },
  "Barangay Captain": {
    "dashboard": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: true },
    "residents": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    "documents": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    "community": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    "cases": { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true },
    "business": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    "communication": { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: false },
    "administration": { canView: true, canCreate: false, canEdit: true, canDelete: false, canApprove: false },
  },
  "Secretary": {
    "dashboard": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "residents": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    "documents": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    "community": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    "cases": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    "business": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    "communication": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false },
    "administration": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
  "Treasurer": {
    "dashboard": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "residents": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "documents": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "community": { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "cases": { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "business": { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true },
    "communication": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "administration": { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
  "Staff": {
    "dashboard": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "residents": { canView: true, canCreate: true, canEdit: false, canDelete: false, canApprove: false },
    "documents": { canView: true, canCreate: true, canEdit: false, canDelete: false, canApprove: false },
    "community": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "cases": { canView: true, canCreate: true, canEdit: false, canDelete: false, canApprove: false },
    "business": { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
    "communication": { canView: true, canCreate: true, canEdit: false, canDelete: false, canApprove: false },
    "administration": { canView: false, canCreate: false, canEdit: false, canDelete: false, canApprove: false },
  },
};

const DEFAULT_DENY: PermissionSet = {
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,
};

export function checkPermissions(role: string | null | undefined, module: string): PermissionSet {
  if (!role) return DEFAULT_DENY;
  const userRole = role as UserRole;
  const perms = ROLE_PERMISSIONS[userRole];
  if (!perms) return DEFAULT_DENY;

  // Super Admin bypass
  if (perms["*"]) return perms["*"];

  return perms[module] || DEFAULT_DENY;
}
