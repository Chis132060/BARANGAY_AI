"use server";

import { createClient } from "@/lib/supabase/server";

export interface BusinessItem {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: string;
  address: string;
  status: "Pending" | "Active" | "Inactive" | "Expired";
  owner: {
    first_name: string;
    last_name: string;
  };
}

export async function fetchBusinesses(statusFilter = "All"): Promise<BusinessItem[]> {
  const supabase = createClient();
  
  let query = supabase
    .from("businesses")
    .select(`
      id,
      owner_id,
      business_name,
      business_type,
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
}) {
  const supabase = createClient();

  const { error } = await supabase
    .from("businesses")
    .insert({
      owner_id: formData.owner_id,
      business_name: formData.business_name,
      business_type: formData.business_type,
      address: formData.address,
      status: "Pending",
    });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updateBusinessStatus(businessId: string, status: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("businesses")
    .update({ status })
    .eq("id", businessId);

  if (error) throw new Error(error.message);
  return { success: true };
}
