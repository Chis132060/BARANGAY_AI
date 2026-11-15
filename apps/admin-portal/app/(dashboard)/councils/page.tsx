import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../administration/rbac-actions";
import { fetchCouncils, type BarangayCouncil } from "./actions";
import { CouncilsClient } from "./components/CouncilsClient";

export const metadata = {
  title: "Councils & Committees | Admin",
  description: "Staff-only verified council appointments and program responsibilities.",
};

export default async function CouncilsPage() {
  let councils: BarangayCouncil[] = [];
  let loadError: string | null = null;
  try {
    councils = await fetchCouncils();
  } catch (error) {
    console.error("Unable to load Councils & Committees:", error);
    loadError = "Council records could not be loaded. Check permissions or the database migration, then retry.";
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const permissions = {
    canCreate: !!user && await checkUserPermission(user.id, "programs", "canCreate"),
    canEdit: !!user && await checkUserPermission(user.id, "programs", "canEdit"),
    canDelete: !!user && await checkUserPermission(user.id, "programs", "canDelete"),
  };

  return <CouncilsClient initialCouncils={councils} loadError={loadError} permissions={permissions} />;
}
