"use server";

import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../administration/rbac-actions";

export interface BusinessItem {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: string;
  business_nature?: string;
  registration_type?: string;
  dti_sec_registration_no?: string;
  tin?: string;
  establishment_type?: string;
  capitalization?: number;
  gross_sales_previous_year?: number;
  address: string;
  status: "Pending" | "Active" | "Inactive" | "Expired";
  owner: {
    first_name: string;
    last_name: string;
  };
}

export interface BusinessPermitItem {
  id: string;
  business_id: string;
  permit_number?: string;
  permit_type?: string;
  issue_date: string;
  expiration_date: string;
  status: "Active" | "Expired" | "Revoked";
  application_year?: number;
  fee_amount?: number;
  or_number?: string;
  business?: { business_name: string };
}

export async function fetchBusinesses(statusFilter = "All"): Promise<BusinessItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!(await checkUserPermission(user.id, "business", "canView"))) throw new Error("Insufficient permissions: view on business required");
  
  let query = supabase
    .from("businesses")
    .select(`
      id,
      owner_id,
      business_name,
      business_type,
      business_nature,
      registration_type,
      dti_sec_registration_no,
      tin,
      establishment_type,
      capitalization,
      gross_sales_previous_year,
      address,
      status,
      owner:residents (
        first_name,
        last_name
      )
    `);

  if (statusFilter !== "All") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching businesses:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as BusinessItem[];
}

export async function createBusiness(formData: {
  owner_id: string;
  business_name: string;
  business_type: string;
  address: string;
  business_nature?: string;
  registration_type?: "New" | "Renewal";
  dti_sec_registration_no?: string;
  tin?: string;
  establishment_type?: string;
  capitalization?: number;
  gross_sales_previous_year?: number;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "business", "canCreate"))) throw new Error("Insufficient permissions to create a business record");

  const { error } = await supabase
    .from("businesses")
    .insert({
      owner_id: formData.owner_id,
      business_name: formData.business_name,
      business_type: formData.business_type,
      business_nature: formData.business_nature || null,
      registration_type: formData.registration_type || "New",
      dti_sec_registration_no: formData.dti_sec_registration_no || null,
      tin: formData.tin || null,
      establishment_type: formData.establishment_type || null,
      capitalization: formData.capitalization ?? null,
      gross_sales_previous_year: formData.gross_sales_previous_year ?? null,
      address: formData.address,
      status: "Pending",
    });

  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "CREATE_BUSINESS_RECORD", module: "business", details: { business_name: formData.business_name, business_type: formData.business_type } });
  return { success: true };
}

export async function updateBusinessStatus(businessId: string, status: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const canEdit = await checkUserPermission(user.id, "business", "canEdit");
  const canApprove = await checkUserPermission(user.id, "business", "canApprove");
  if (!canEdit && !canApprove) throw new Error("Insufficient permissions to update a business record");

  const { error } = await supabase
    .from("businesses")
    .update({ status })
    .eq("id", businessId);

  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "UPDATE_BUSINESS_STATUS", module: "business", details: { business_id: businessId, status } });
  return { success: true };
}

export async function fetchBusinessPermits(statusFilter = "All"): Promise<BusinessPermitItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!(await checkUserPermission(user.id, "business", "canView"))) throw new Error("Insufficient permissions: view on business required");

  let query = supabase.from("business_permits").select(`
    id, business_id, permit_number, permit_type, issue_date, expiration_date,
    status, application_year, fee_amount, or_number,
    business:businesses (business_name)
  `).order("issue_date", { ascending: false });
  if (statusFilter !== "All") query = query.eq("status", statusFilter);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as BusinessPermitItem[];
}

export async function issueBusinessPermit(input: {
  business_id: string;
  permit_type: string;
  issue_date: string;
  expiration_date: string;
  fee_amount?: number;
  or_number?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const canEdit = await checkUserPermission(user.id, "business", "canEdit");
  const canApprove = await checkUserPermission(user.id, "business", "canApprove");
  if (!canEdit && !canApprove) throw new Error("Insufficient permissions to issue a business permit");
  if (!input.business_id || !input.permit_type || !input.issue_date || !input.expiration_date) throw new Error("Business, permit type, issue date, and expiration date are required");
  if (new Date(input.expiration_date) < new Date(input.issue_date)) throw new Error("Expiration date cannot be earlier than issue date");

  const year = new Date(input.issue_date).getFullYear();
  const permitNumber = `BP-${year}-${Date.now().toString().slice(-8)}`;
  const { data, error } = await supabase.from("business_permits").insert({
    business_id: input.business_id,
    permit_number: permitNumber,
    permit_type: input.permit_type.trim(),
    issue_date: input.issue_date,
    expiration_date: input.expiration_date,
    application_year: year,
    fee_amount: input.fee_amount ?? 0,
    or_number: input.or_number?.trim() || null,
    issued_by: user.id,
    status: "Active",
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "ISSUE_BUSINESS_PERMIT", module: "business", details: { permit_id: data.id, business_id: input.business_id, permit_number: permitNumber } });
  return { success: true, id: data.id };
}

export async function updateBusinessPermitStatus(permitId: string, status: "Active" | "Expired" | "Revoked") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const canEdit = await checkUserPermission(user.id, "business", "canEdit");
  const canApprove = await checkUserPermission(user.id, "business", "canApprove");
  if (!canEdit && !canApprove) throw new Error("Insufficient permissions to update a business permit");
  const { data, error } = await supabase.from("business_permits").update({ status }).eq("id", permitId).select("id, status").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Permit status update did not change a record");
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "UPDATE_BUSINESS_PERMIT_STATUS", module: "business", details: { permit_id: permitId, status } });
  return { success: true };
}
