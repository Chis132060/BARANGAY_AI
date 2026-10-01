"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface OrgMember {
  id: string;
  organization_id: string;
  resident_id?: string;
  full_name: string;
  contact_number?: string;
  purok?: string;
  role?: string;
  date_joined: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface BarangayOrganization {
  id: string;
  name: string;
  code?: string;
  description?: string;
  org_type: string;
  is_custom: boolean;
  president?: string;
  contact?: string;
  established_date?: string;
  status: string;
  member_count?: number;
  created_at: string;
}

export async function fetchOrganizations(): Promise<BarangayOrganization[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barangay_organizations")
    .select("*, member_count:organization_members(count)")
    .order("is_custom", { ascending: true })
    .order("name");

  if (error) {
    console.error("Error fetching organizations:", error.message);
    throw new Error(error.message);
  }

  return (data || []).map((o: any) => ({
    ...o,
    member_count: o.member_count?.[0]?.count ?? 0,
  })) as BarangayOrganization[];
}

export async function fetchOrgMembers(orgId: string): Promise<OrgMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*")
    .eq("organization_id", orgId)
    .order("date_joined", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as OrgMember[];
}

export async function createOrganization(
  formData: Omit<BarangayOrganization, "id" | "created_at" | "member_count">
): Promise<{ success: boolean; id: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barangay_organizations")
    .insert({
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      org_type: formData.org_type,
      is_custom: formData.is_custom,
      president: formData.president || null,
      contact: formData.contact || null,
      established_date: formData.established_date || null,
      status: formData.status || "Active",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/organizations");
  return { success: true, id: data.id };
}

export async function addOrgMember(
  formData: Omit<OrgMember, "id" | "created_at">
): Promise<{ success: boolean; id: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      organization_id: formData.organization_id,
      resident_id: formData.resident_id || null,
      full_name: formData.full_name,
      contact_number: formData.contact_number || null,
      purok: formData.purok || null,
      role: formData.role || "Member",
      date_joined: formData.date_joined,
      status: formData.status || "Active",
      notes: formData.notes || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/organizations");
  return { success: true, id: data.id };
}

export async function removeOrgMember(memberId: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
  revalidatePath("/organizations");
  return { success: true };
}

export async function deleteOrganization(orgId: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from("barangay_organizations").delete().eq("id", orgId);
  if (error) throw new Error(error.message);
  revalidatePath("/organizations");
  return { success: true };
}
