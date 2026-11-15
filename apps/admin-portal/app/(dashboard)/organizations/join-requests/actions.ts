"use server";

import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../../administration/rbac-actions";
import { revalidatePath } from "next/cache";

export interface JoinApplication {
  id: string;
  organization_id: string;
  resident_id: string;
  status: "Pending" | "Approved" | "Rejected";
  reason: string;
  created_at: string;
  organization: { name: string } | null;
  resident: { first_name: string; last_name: string; verification_status: string } | null;
}

async function requirePermission(kind: "canView" | "canEdit") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "organizations", kind))) {
    throw new Error("Organization review permission required");
  }
  return { supabase, user };
}

export async function fetchJoinApplications(): Promise<JoinApplication[]> {
  const { supabase } = await requirePermission("canView");
  const { data, error } = await supabase.from("organization_join_requests")
    .select("id,organization_id,resident_id,status,reason,created_at,organization:barangay_organizations(name),resident:residents(first_name,last_name,verification_status)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as JoinApplication[];
}

export async function reviewJoinApplication(
  id: string, decision: "Approved" | "Rejected", reason: string
) {
  const { supabase, user } = await requirePermission("canEdit");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid application identifier");
  if (decision === "Rejected" && !reason.trim()) {
    throw new Error("Explain why the application was rejected.");
  }
  if (reason.length > 500) throw new Error("Review note is too long");
  const { data, error } = await supabase.from("organization_join_requests").update({
    status: decision,
    reason: reason.trim(),
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  }).eq("id", id).eq("status", "Pending").select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("This application was already reviewed or is unavailable.");
  // Approval trigger atomically creates the staff-verified organization member.
  revalidatePath("/organizations");
  revalidatePath("/organizations/join-requests");
  return { success: true };
}
