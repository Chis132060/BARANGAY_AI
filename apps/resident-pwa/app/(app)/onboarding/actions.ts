"use server";

import { createClient } from "@/lib/supabase/server";

export interface ResidentOnboardingInput {
  householdNumber?: string;
  joinExistingHousehold?: boolean;
  householdSize: number;
  monthlyIncome?: number;
  housingType: "Owned" | "Rented" | "Informal Settler" | "Other";
  relationshipToHead: string;
  seniorStatus: boolean;
  pwdStatus: boolean;
  fourPsStatus: boolean;
}

export async function completeResidentOnboarding(input: ResidentOnboardingInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to complete onboarding.");

  const { data: resident, error: residentError } = await supabase
    .from("residents")
    .select("id, verification_status, household_onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  if (residentError) throw new Error(residentError.message);
  if (!resident || resident.verification_status !== "Verified") {
    throw new Error("Your resident account must be verified before completing onboarding.");
  }

  const submittedHouseholdNumber = input.householdNumber?.trim();
  const householdNumber = input.joinExistingHousehold
    ? submittedHouseholdNumber
    : submittedHouseholdNumber || `HH-${resident.id.slice(0, 8).toUpperCase()}`;
  let household: { id: string } | null = null;
  if (input.joinExistingHousehold) {
    if (!householdNumber) throw new Error("Enter your household number to join your family.");
    const { data, error } = await supabase.rpc("join_household_by_number", { p_household_number: householdNumber });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("We could not join that household. Check the household number with your household head or Barangay staff.");
    household = { id: data as string };
    const { data: assigned, error: assignedError } = await supabase.from("household_members").select("household_id").eq("resident_id", resident.id).maybeSingle();
    if (assignedError) throw new Error(assignedError.message);
    if (assigned && assigned.household_id !== household.id) throw new Error("This resident is already assigned to a different household. Contact Barangay staff to correct it.");
  }

  const effectiveHouseholdNumber = householdNumber || "";
  if (!household) {
    const { data: existingHousehold, error: householdLookupError } = await supabase
    .from("households")
    .select("id")
    .eq("household_head_id", resident.id)
    .maybeSingle();
    if (householdLookupError) throw new Error(householdLookupError.message);
    household = existingHousehold;
  }

  if (household) {
    if (!input.joinExistingHousehold) {
      const { error } = await supabase.from("households").update({
        household_number: effectiveHouseholdNumber,
        member_count: Math.max(1, input.householdSize),
        monthly_income: input.monthlyIncome ?? 0,
        housing_type: input.housingType,
      }).eq("id", household.id);
      if (error) throw new Error(error.message);
    }
  } else {
    const { data: createdHousehold, error } = await supabase
      .from("households")
      .insert({
        household_number: effectiveHouseholdNumber,
        household_head_id: resident.id,
        member_count: Math.max(1, input.householdSize),
        monthly_income: input.monthlyIncome ?? 0,
        housing_type: input.housingType,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    household = createdHousehold;
  }

  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from("household_members")
    .select("id")
    .eq("household_id", household.id)
    .eq("resident_id", resident.id)
    .maybeSingle();
  if (membershipLookupError) throw new Error(membershipLookupError.message);

  if (existingMembership) {
    const { error } = await supabase
      .from("household_members")
      .update({ relationship: input.relationshipToHead.trim() || "Household Member" })
      .eq("id", existingMembership.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("household_members").insert({
      household_id: household.id,
      resident_id: resident.id,
      relationship: input.relationshipToHead.trim() || "Household Member",
    });
    if (error) throw new Error(error.message);
  }

  const { error: updateError } = await supabase
    .from("residents")
    .update({
      senior_status: input.seniorStatus,
      pwd_status: input.pwdStatus,
      four_ps_status: input.fourPsStatus,
      household_onboarding_completed: true,
      household_onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", resident.id);

  if (updateError) throw new Error(updateError.message);

  const { error: auditError } = await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "COMPLETE_RESIDENT_ONBOARDING",
    module: "residents",
    details: {
      resident_id: resident.id,
      household_id: household.id,
      household_size: input.householdSize,
      senior_status: input.seniorStatus,
      pwd_status: input.pwdStatus,
      four_ps_status: input.fourPsStatus,
    },
  });

  if (auditError) console.warn("Resident onboarding audit could not be written:", auditError.message);

  return { success: true };
}
