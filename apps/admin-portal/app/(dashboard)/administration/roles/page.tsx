import { Shield } from "lucide-react";
import { RolesClient } from "./components/RolesClient";
import { fetchRolesWithPermissions } from "../rbac-actions";

export const metadata = { title: "Roles & Permissions | Admin" };

export default async function RolesPage() {
  let rolesWithPerms: any[] = [];
  try {
    rolesWithPerms = await fetchRolesWithPermissions();
  } catch {
    rolesWithPerms = [];
  }

  return <RolesClient initialRoles={rolesWithPerms} />;
}
