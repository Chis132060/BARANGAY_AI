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

export async function addHouseholdMember(householdId: string, residentId: string, relationship = "Household Member") {
  const supabase = await authorized("canEdit");
  const { data: existing, error: lookupError } = await supabase.from("household_members").select("id").eq("resident_id", residentId).limit(1);
  if (lookupError) throw new Error(lookupError.message);
  if (existing?.length) throw new Error("Resident already belongs to a household");
  const { error } = await supabase.from("household_members").insert({ household_id: householdId, resident_id: residentId, relationship: relationship.trim() || "Household Member" });
  if (error) throw new Error(error.message);
  revalidatePath("/residents/household");
}

export async function removeHouseholdMember(householdId: string, residentId: string) {
  const supabase = await authorized("canDelete");
  const { error } = await supabase.from("household_members").delete().eq("household_id", householdId).eq("resident_id", residentId);
  if (error) throw new Error(error.message);
  revalidatePath("/residents/household");
}

export async function fetchHouseholdMembers(): Promise<Array<{ household_id: string; resident_id: string; first_name: string; last_name: string; relationship?: string | null }>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "residents", "canView"))) throw new Error("Insufficient permissions");
  const { data: memberships, error } = await supabase.from("household_members").select("household_id,resident_id,relationship");
  if (error) throw new Error(error.message);
  const ids = Array.from(new Set((memberships || []).map((m: { resident_id: string }) => m.resident_id)));
  if (!ids.length) return [];
  const { data: residents, error: residentError } = await supabase.from("residents").select("id,first_name,last_name").in("id",ids);
  if (residentError) throw new Error(residentError.message);
  const byId = new Map<string, { id: string; first_name: string; last_name: string }>((residents || []).map((r: { id: string; first_name: string; last_name: string }) => [r.id,r] as const));
  return (memberships || []).map((m: { household_id: string; resident_id: string; relationship?: string | null }) => ({
    ...m, first_name: byId.get(m.resident_id)?.first_name || "Unknown",
    last_name: byId.get(m.resident_id)?.last_name || "",
  }));
}

export async function createFamilyResident(input: {
  householdId: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  birth_date: string;
  gender: "Male" | "Female" | "Other";
  relationship?: string;
}) {
  const supabase = await authorized("canCreate");
  const firstName = input.first_name.trim();
  const lastName = input.last_name.trim();
  if (!firstName || !lastName || !input.birth_date || !["Male", "Female", "Other"].includes(input.gender)) throw new Error("First name, last name, birth date, and gender are required.");
  if (input.birth_date > new Date().toISOString().slice(0, 10)) throw new Error("Birth date cannot be in the future.");

  const { data: existingHousehold, error: householdError } = await supabase.from("households").select("id").eq("id", input.householdId).maybeSingle();
  if (householdError) throw new Error(householdError.message);
  if (!existingHousehold) throw new Error("Household not found.");

  const { data: resident, error } = await supabase.from("residents").insert({
    first_name: firstName,
    middle_name: input.middle_name?.trim() || null,
    last_name: lastName,
    birth_date: input.birth_date,
    gender: input.gender,
    civil_status: "Single",
    verification_status: "Pending",
    voter_status: false,
    senior_status: false,
    pwd_status: false,
    four_ps_status: false,
  }).select("id").single();
  if (error) throw new Error(error.message);

  const { error: membershipError } = await supabase.from("household_members").insert({
    household_id: input.householdId,
    resident_id: resident.id,
    relationship: input.relationship?.trim() || "Household Member",
  });
  if (membershipError) {
    await supabase.from("residents").delete().eq("id", resident.id).eq("verification_status", "Pending");
    throw new Error(membershipError.message);
  }

  revalidatePath("/residents");
  revalidatePath("/residents/verification");
  revalidatePath("/residents/household");
  return { id: resident.id };
}
