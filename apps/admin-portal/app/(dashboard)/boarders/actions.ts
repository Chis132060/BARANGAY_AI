"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface BoarderListItem {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birth_date: string;
  gender: string;
  civil_status?: string;
  contact_number?: string;
  id_type?: string;
  landlord_name?: string;
  landlord_contact?: string;
  property_address?: string;
  purok?: string;
  monthly_rent?: number;
  move_in_date?: string;
  status: string;
  created_at: string;
}

export async function fetchBoarders(search = ""): Promise<BoarderListItem[]> {
  const supabase = createClient();

  let query = supabase
    .from("boarders")
    .select("*")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,landlord_name.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching boarders:", error.message);
    throw new Error(error.message);
  }
  return (data || []) as BoarderListItem[];
}

export async function createBoarder(
  formData: Omit<BoarderListItem, "id" | "created_at">
): Promise<{ success: boolean; id: string }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("boarders")
    .insert({
      first_name: formData.first_name,
      middle_name: formData.middle_name || null,
      last_name: formData.last_name,
      birth_date: formData.birth_date,
      gender: formData.gender,
      civil_status: formData.civil_status || null,
      contact_number: formData.contact_number || null,
      id_type: formData.id_type || null,
      landlord_name: formData.landlord_name || null,
      landlord_contact: formData.landlord_contact || null,
      property_address: formData.property_address || null,
      purok: formData.purok || null,
      monthly_rent: formData.monthly_rent || null,
      move_in_date: formData.move_in_date || null,
      status: formData.status || "Active",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/boarders");
  return { success: true, id: data.id };
}

export async function updateBoarderStatus(
  boarderId: string,
  status: string
): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("boarders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", boarderId);
  if (error) throw new Error(error.message);
  revalidatePath("/boarders");
  return { success: true };
}

export async function deleteBoarder(
  boarderId: string
): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("boarders")
    .delete()
    .eq("id", boarderId);
  if (error) throw new Error(error.message);
  revalidatePath("/boarders");
  return { success: true };
}
