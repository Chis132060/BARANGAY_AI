import { Users } from "lucide-react";
import { UsersClient } from "./components/UsersClient";
import { fetchSystemUsers, fetchRoles } from "../rbac-actions";

export const metadata = { title: "System Users | Admin" };

export default async function UsersAdministrationPage() {
  let users: any[] = [];
  let roles: any[] = [];
  try {
    [users, roles] = await Promise.all([fetchSystemUsers(), fetchRoles()]);
  } catch {
    users = [];
    roles = [];
  }

  return <UsersClient initialUsers={users} initialRoles={roles} />;
}
