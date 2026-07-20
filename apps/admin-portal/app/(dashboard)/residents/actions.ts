"use server";

import { createClient } from "@/lib/supabase/server";

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
