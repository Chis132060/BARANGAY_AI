import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../rbac-actions";
import { SystemTestsDashboard } from "./system-tests-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "System Tests | Admin" };

export default async function SystemTestsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "administration", "canView"))) redirect("/dashboard");
  return <SystemTestsDashboard />;
}
