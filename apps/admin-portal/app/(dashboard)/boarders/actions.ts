"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkUserPermission } from "../administration/rbac-actions";

async function requireBoarderPermission(action: "canView" | "canCreate" | "canEdit" | "canDelete") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "boarders", action))) throw new Error("Insufficient boarders permissions");
}

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
  await requireBoarderPermission("canView");
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

function validateBoarderInput(formData: Omit<BoarderListItem, "id" | "created_at">) {
  const today = new Date().toISOString().slice(0, 10);
  const isDate = (value: string) => /^\\d{4}-\\d{2}-\\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!formData.first_name?.trim() || !formData.last_name?.trim()) throw new Error("First and last names are required.");
  if (!formData.birth_date || !isDate(formData.birth_date) || formData.birth_date > today) throw new Error("Enter a valid birth date that is not in the future.");
  if (formData.move_in_date && (!isDate(formData.move_in_date) || formData.move_in_date > today)) throw new Error("Move-in date must be valid and cannot be in the future.");
  if (formData.monthly_rent != null && (!Number.isFinite(formData.monthly_rent) || formData.monthly_rent < 0)) throw new Error("Monthly rent must be a non-negative amount.");
  if (!["Active", "Inactive", "Left"].includes(formData.status || "Active")) throw new Error("Invalid boarder status.");
}

export async function createBoarder(
  formData: Omit<BoarderListItem, "id" | "created_at">
): Promise<{ success: boolean; id: string }> {
  await requireBoarderPermission("canCreate");
  validateBoarderInput(formData);
  const supabase = createClient();

  // Prevent accidental duplicate registrations for the same name and birth date.
  // A match requires manual review; never overwrite an existing record.
  const { data: possibleDuplicates, error: duplicateError } = await supabase
    .from("boarders")
    .select("id, first_name, last_name, birth_date")
    .eq("birth_date", formData.birth_date)
    .ilike("first_name", formData.first_name.trim())
    .ilike("last_name", formData.last_name.trim())
    .limit(1);
  if (duplicateError) throw new Error("Unable to verify possible duplicate boarder records.");
  if (possibleDuplicates?.length) {
    throw new Error("A boarder with the same name and birth date already exists. Review the existing record before adding another.");
  }

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
  await requireBoarderPermission("canEdit");
  if (!["Active", "Inactive", "Left"].includes(status)) throw new Error("Invalid boarder status");
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
  await requireBoarderPermission("canDelete");
  const supabase = createClient();
  const { error } = await supabase
    .from("boarders")
    .delete()
    .eq("id", boarderId);
  if (error) throw new Error(error.message);
  revalidatePath("/boarders");
  return { success: true };
}
