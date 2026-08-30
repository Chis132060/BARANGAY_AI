"use server";

import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../administration/rbac-actions";

export interface ResidentListItem {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birth_date: string;
  gender: string;
  civil_status: string;
  contact_number?: string;
  voter_status: boolean;
  senior_status: boolean;
  pwd_status: boolean;
  four_ps_status: boolean;
  address?: {
    house_number?: string;
    street?: string;
    purok?: string;
  };
}

export async function fetchResidents(search = "", filter = "All"): Promise<ResidentListItem[]> {
  const supabase = createClient();
  
  let query = supabase
    .from("residents")
    .select(`
      id,
      first_name,
      middle_name,
      last_name,
      birth_date,
      gender,
      civil_status,
      contact_number,
      voter_status,
      senior_status,
      pwd_status,
      four_ps_status,
      address:addresses (
        house_number,
        street,
        purok
      )
    `);

  // Handle Text Search
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  // Handle Category Filters
  if (filter === "Voter") {
    query = query.eq("voter_status", true);
  } else if (filter === "Senior") {
    query = query.eq("senior_status", true);
  } else if (filter === "PWD") {
    query = query.eq("pwd_status", true);
  } else if (filter === "4Ps") {
    query = query.eq("four_ps_status", true);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching residents from database:", error.message);
    throw new Error(error.message);
  }

  // Cast address relation response object safely
  return (data || []).map((res: any) => ({
    ...res,
    address: Array.isArray(res.address) ? res.address[0] : res.address,
  })) as ResidentListItem[];
}

export async function createResident(formData: Omit<ResidentListItem, "id">) {
  const supabase = createClient();

  const { data: resData, error: resError } = await supabase
    .from("residents")
    .insert({
      first_name: formData.first_name,
      middle_name: formData.middle_name,
      last_name: formData.last_name,
      birth_date: formData.birth_date,
      gender: formData.gender,
      civil_status: formData.civil_status,
      contact_number: formData.contact_number,
      voter_status: formData.voter_status,
      senior_status: formData.senior_status,
      pwd_status: formData.pwd_status,
      four_ps_status: formData.four_ps_status,
    })
    .select("id")
    .single();

  if (resError) throw new Error(resError.message);

  if (formData.address && resData) {
    const { error: addrError } = await supabase
      .from("addresses")
      .insert({
        resident_id: resData.id,
        house_number: formData.address.house_number,
        street: formData.address.street,
        purok: formData.address.purok,
      });
      
    if (addrError) throw new Error(addrError.message);
  }

  return { success: true, id: resData.id };
}

// ─── Verification Queue Actions ─────────────────────────────────────────────

export interface PendingResident {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  birth_date: string;
  gender: string;
  contact_number?: string;
  id_type?: string;
  id_photo_url?: string;
  verification_status: string;
  created_at: string;
  address?: {
    house_number?: string;
    street?: string;
    purok?: string;
  };
}

export async function fetchPendingVerifications(): Promise<PendingResident[]> {
  const supabase = createClient();

  // Server-side RBAC check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const allowed = await checkUserPermission(user.id, "residents", "canApprove");
  if (!allowed) throw new Error("Insufficient permissions: canApprove on residents required");

  const { data, error } = await supabase
    .from("residents")
    .select(`
      id,
      first_name,
      middle_name,
      last_name,
      email,
      birth_date,
      gender,
      contact_number,
      id_type,
      id_photo_url,
      verification_status,
      created_at,
      address:addresses (
        house_number,
        street,
        purok
      )
    `)
    .eq("verification_status", "Pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((res: any) => ({
    ...res,
    address: Array.isArray(res.address) ? res.address[0] : res.address,
  })) as PendingResident[];
}

export async function approveResident(residentId: string): Promise<{ success: boolean }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const allowed = await checkUserPermission(user.id, "residents", "canApprove");
  if (!allowed) throw new Error("Insufficient permissions: canApprove on residents required");

  const { data: target } = await supabase
    .from("residents")
    .select("user_id, first_name, last_name, email")
    .eq("id", residentId)
    .maybeSingle();

  const { error } = await supabase
    .from("residents")
    .update({ verification_status: "Verified", updated_at: new Date().toISOString() })
    .eq("id", residentId);

  if (error) throw new Error(error.message);

  // Send resident notification
  if (target?.user_id) {
    await supabase.from("notifications").insert({
      user_id: target.user_id,
      title: "Resident Account Verified",
      message: "Your Barangay resident registration has been approved by the Barangay Office. You can now submit online requests for Clearances and Certificates.",
      read_status: false,
    });
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "VERIFY_RESIDENT",
    module: "residents",
    details: {
      resident_id: residentId,
      resident_name: target ? `${target.first_name} ${target.last_name}`.trim() : undefined,
      resident_email: target?.email ?? undefined,
      approved_at: new Date().toISOString(),
    },
  });

  return { success: true };
}

export async function rejectResident(residentId: string, reason?: string): Promise<{ success: boolean }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const allowed = await checkUserPermission(user.id, "residents", "canApprove");
  if (!allowed) throw new Error("Insufficient permissions: canApprove on residents required");

  if (!reason || !reason.trim()) {
    throw new Error("A rejection reason is required.");
  }

  const { data: target } = await supabase
    .from("residents")
    .select("user_id, first_name, last_name, email")
    .eq("id", residentId)
    .maybeSingle();

  const updateData: Record<string, any> = {
    verification_status: "Rejected",
    rejection_reason: reason.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("residents")
    .update(updateData)
    .eq("id", residentId);

  if (error) throw new Error(error.message);

  // Send resident notification
  if (target?.user_id) {
    await supabase.from("notifications").insert({
      user_id: target.user_id,
      title: "Registration Verification Update",
      message: `Your resident account verification could not be approved: ${reason.trim()}. Please visit the Barangay Hall or re-upload clear ID documents.`,
      read_status: false,
    });
  }

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "REJECT_RESIDENT",
    module: "residents",
    details: {
      resident_id: residentId,
      resident_name: target ? `${target.first_name} ${target.last_name}`.trim() : undefined,
      resident_email: target?.email ?? undefined,
      rejection_reason: reason.trim(),
      rejected_at: new Date().toISOString(),
    },
  });

  return { success: true };
}
