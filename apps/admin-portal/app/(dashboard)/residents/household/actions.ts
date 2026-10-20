"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../../administration/rbac-actions";

async function authorized(action: "canCreate" | "canEdit" | "canDelete") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "residents", action))) throw new Error("Insufficient permissions");
  return supabase;
}

export async function createHousehold(input: { household_number: string; household_head_id?: string; housing_type?: string; monthly_income?: number }) {
  const supabase = await authorized("canCreate");
  const number = input.household_number.trim();
  if (!number || number.length > 80) throw new Error("Invalid household number");
  if (input.monthly_income !== undefined && (!Number.isFinite(input.monthly_income) || input.monthly_income < 0)) throw new Error("Invalid monthly income");
  const { data, error } = await supabase.from("households").insert({
    household_number: number, household_head_id: input.household_head_id || null,
    housing_type: input.housing_type?.trim() || null, monthly_income: input.monthly_income ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/residents/household");
  return data.id as string;
}

export async function addHouseholdMember(householdId: string, residentId: string) {
  const supabase = await authorized("canEdit");
  const { data: existing, error: lookupError } = await supabase.from("household_members").select("id").eq("resident_id", residentId).limit(1);
  if (lookupError) throw new Error(lookupError.message);
  if (existing?.length) throw new Error("Resident already belongs to a household");
  const { error } = await supabase.from("household_members").insert({ household_id: householdId, resident_id: residentId });
  if (error) throw new Error(error.message);
  revalidatePath("/residents/household");
}

export async function removeHouseholdMember(householdId: string, residentId: string) {
  const supabase = await authorized("canDelete");
  const { error } = await supabase.from("household_members").delete().eq("household_id", householdId).eq("resident_id", residentId);
  if (error) throw new Error(error.message);
  revalidatePath("/residents/household");
}
