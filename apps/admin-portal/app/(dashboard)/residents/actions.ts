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
  verification_status?: "Pending" | "Verified" | "Rejected";
  id_type?: string;
  id_photo_url?: string;
  address?: {
    house_number?: string;
    street?: string;
    purok?: string;
  };
}

export async function fetchResidents(search = "", filter = "All"): Promise<ResidentListItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "residents", "canView"))) throw new Error("Insufficient permissions to view residents");
  
  let query = supabase
    .from("residents")
    // Approved portal registrations and staff-created records belong in the registry.\n    // Pending accounts linked to a login must stay in the verification queue.
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
      verification_status,
      id_type,
      id_photo_url,
      address:addresses (
        house_number,
        street,
        purok
      )
    `)
    .eq("verification_status", "Verified");

  // Some server-side Supabase adapters expose a limited query builder.
  // Apply registry filters after fetching so these pages do not depend on
  // optional .eq() chaining methods on the select result.
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching residents from database:", error.message);
    throw new Error(error.message);
  }

  const term = search.trim().toLocaleLowerCase();
  const filtered = (data || []).filter((resident: any) => {
    const matchesSearch = !term || `${resident.first_name || ""} ${resident.last_name || ""}`
      .toLocaleLowerCase().includes(term);
    const matchesCategory =
      filter === "Voter" ? resident.voter_status === true :
      filter === "Senior" ? resident.senior_status === true :
      filter === "PWD" ? resident.pwd_status === true :
      filter === "4Ps" ? resident.four_ps_status === true : true;
    return matchesSearch && matchesCategory;
  });

  // Cast address relation response object safely
  return filtered.map((res: any) => ({
    ...res,
    address: Array.isArray(res.address) ? res.address[0] : res.address,
  })) as ResidentListItem[];
}

export interface HouseholdListItem {
  id: string;
  household_number: string;
  monthly_income?: number;
  housing_type?: string;
  member_count?: number;
  head?: { first_name: string; last_name: string };
}

export async function fetchHouseholds(): Promise<HouseholdListItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const allowed = await checkUserPermission(user.id, "residents", "canView");
  if (!allowed) throw new Error("Insufficient permissions: view on residents required");

  const { data, error } = await supabase.from("households").select(`
    id, household_number, monthly_income, housing_type, member_count,
    head:residents!households_household_head_id_fkey(first_name, last_name)
  `).order("household_number");
  if (error) throw new Error(error.message);
  return (data || []) as HouseholdListItem[];
}

export async function createResident(formData: Omit<ResidentListItem, "id">) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "residents", "canCreate"))) throw new Error("Insufficient permissions to create residents");

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
      verification_status: "Verified",
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
      
    if (addrError) {
      // Avoid leaving a resident without their submitted address when creation fails.
      const { error: rollbackError } = await supabase
        .from("residents")
        .delete()
        .eq("id", resData.id);
      if (rollbackError) {
        throw new Error(`Address creation failed: ${addrError.message}. Resident cleanup also failed: ${rollbackError.message}`);
      }
      throw new Error(`Address creation failed: ${addrError.message}. Resident creation was rolled back.`);
    }
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

  const [canView, canApprove] = await Promise.all([
    checkUserPermission(user.id, "residents", "canView"),
    checkUserPermission(user.id, "residents", "canApprove"),
  ]);
  if (!canView && !canApprove) throw new Error("Insufficient permissions: residents view permission required");

  const { data, error } = await supabase
    .from("residents")
    .select(`
      id,
      user_id,
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
    .not("user_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).map((res: any) => ({
    ...res,
    address: Array.isArray(res.address) ? res.address[0] : res.address,
  })) as PendingResident[];
}

/** Resolve a private ID image only when a reviewer opens the applicant. */
export async function fetchResidentIdPhotoUrl(residentId: string): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const [canView, canApprove] = await Promise.all([
    checkUserPermission(user.id, "residents", "canView"),
    checkUserPermission(user.id, "residents", "canApprove"),
  ]);
  if (!canView && !canApprove) throw new Error("Insufficient permissions");
  const { data: resident, error } = await supabase.from("residents")
    .select("id_photo_url").eq("id", residentId).eq("verification_status", "Pending")
    .not("user_id", "is", null).maybeSingle();
  if (error) throw new Error(error.message);
  const photo = resident?.id_photo_url;
  if (!photo) return null;
  // IDs must be stored as private storage paths, never public HTTP URLs.
  if (/^https?:\/\//i.test(photo) || photo.includes("..") || photo.startsWith("/")) throw new Error("Invalid private ID storage path");
  const { data, error: signError } = await supabase.storage.from("resident-ids").createSignedUrl(photo, 300);
  if (signError) throw new Error(signError.message);
  return data?.signedUrl ?? null;
}

/** Generate a short-lived signed URL for a verified resident's ID photo. */
export async function fetchVerifiedResidentPhoto(residentId: string): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const canView = await checkUserPermission(user.id, "residents", "canView");
  if (!canView) throw new Error("Insufficient permissions");
  const { data: resident, error } = await supabase
    .from("residents")
    .select("id_photo_url")
    .eq("id", residentId)
    .eq("verification_status", "Verified")
    .maybeSingle();
  if (error) throw new Error(error.message);
  const photo = resident?.id_photo_url;
  if (!photo) return null;
  // Photos must be stored as private storage paths, never raw public HTTP URLs.
  if (/^https?:\/\//i.test(photo) || photo.includes("..") || photo.startsWith("/")) throw new Error("Invalid private ID storage path");
  const { data, error: signError } = await supabase.storage.from("resident-ids").createSignedUrl(photo, 300);
  if (signError) throw new Error(signError.message);
  return data?.signedUrl ?? null;
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

  if (!target?.user_id || target.user_id === user.id) throw new Error("Cannot review your own account or an unlinked resident");

  const { data: updatedResident, error } = await supabase
    .from("residents")
    .update({ verification_status: "Verified", updated_at: new Date().toISOString() })
    .eq("id", residentId)
    .eq("verification_status", "Pending")
    .not("user_id", "is", null)
    .select("id, verification_status")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updatedResident) throw new Error("Resident approval did not update a record. Check the resident ID and RLS permissions.");

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

  if (reason.trim().length < 10 || reason.trim().length > 500) throw new Error("Rejection reason must be 10–500 characters");

  const updateData: Record<string, any> = {
    verification_status: "Rejected",
    rejection_reason: reason.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!target?.user_id || target.user_id === user.id) throw new Error("Cannot review your own account or an unlinked resident");

  const { data: updatedResident, error } = await supabase
    .from("residents")
    .update(updateData)
    .eq("id", residentId)
    .eq("verification_status", "Pending")
    .not("user_id", "is", null)
    .select("id, verification_status")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!updatedResident) throw new Error("Resident rejection did not update a record. Check the resident ID and RLS permissions.");

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
