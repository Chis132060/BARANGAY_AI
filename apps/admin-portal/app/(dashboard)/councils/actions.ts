"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkUserPermission } from "../administration/rbac-actions";

/** Council appointments are staff-only governance records, not program enrollees. */
export interface BarangayCouncil {
  id: string;
  name: string;
  code: string | null;
  kind: "Council" | "Committee";
  mandate: string | null;
  mandate_reference: string | null;
  established_date: string | null;
  status: "Draft" | "Active" | "Inactive";
  created_at: string;
  updated_at: string;
  member_count?: number;
  program_count?: number;
}

export interface CouncilMember {
  id: string;
  council_id: string;
  resident_id: string | null;
  organization_id: string | null;
  full_name: string;
  position: CouncilPosition;
  appointment_reference: string | null;
  verification_status: "Pending" | "Verified";
  term_start: string | null;
  term_end: string | null;
  created_at: string;
}

export type CouncilPosition =
  "Chairperson" | "Vice Chairperson" | "Secretary" | "Treasurer" |
  "Member" | "Sector Representative" | "Organization Representative" | "Coordinator";

export interface CouncilProgram {
  council_id: string;
  program_id: string;
  program_name: string;
}

export interface CouncilProgramOption {
  id: string;
  name: string;
}

const POSITIONS: readonly string[] = [
  "Chairperson", "Vice Chairperson", "Secretary", "Treasurer",
  "Member", "Sector Representative", "Organization Representative", "Coordinator",
];

async function requireCouncilPermission(action: "canView" | "canCreate" | "canEdit" | "canDelete") {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !(await checkUserPermission(user.id, "programs", action))) {
    throw new Error("Insufficient permissions for Councils & Committees.");
  }
  return supabase;
}

const clean = (value: string | null | undefined, max = 250): string | null => {
  const text = value?.trim();
  if (!text) return null;
  if (text.length > max) throw new Error("A field exceeds the allowed length.");
  return text;
};

export async function fetchCouncils(): Promise<BarangayCouncil[]> {
  const supabase = await requireCouncilPermission("canView");
  const { data, error } = await supabase.from("barangay_councils")
    .select("*, member_count:barangay_council_members(count), program_count:barangay_council_programs(count)")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((item: any) => ({
    ...item,
    member_count: item.member_count?.[0]?.count ?? 0,
    program_count: item.program_count?.[0]?.count ?? 0,
  })) as BarangayCouncil[];
}

export async function createCouncil(input: {
  name: string; code?: string; kind: "Council" | "Committee";
  mandate?: string; mandate_reference?: string; established_date?: string;
}): Promise<BarangayCouncil> {
  const supabase = await requireCouncilPermission("canCreate");
  const name = clean(input.name, 160);
  const code = clean(input.code, 32);
  if (!name || name.length < 3) throw new Error("Council/committee name is required (at least 3 characters).");
  if (input.kind !== "Council" && input.kind !== "Committee") throw new Error("Invalid council type.");
  const { data, error } = await supabase.from("barangay_councils").insert({
    name,
    code,
    kind: input.kind,
    mandate: clean(input.mandate, 3000),
    mandate_reference: clean(input.mandate_reference, 1000),
    established_date: input.established_date || null,
    status: "Draft", // Never assert a council exists officially before review.
  }).select("*").single();
  if (error) throw new Error(error.message);
  revalidatePath("/councils");
  return data as BarangayCouncil;
}

export async function updateCouncil(input: {
  id: string; name: string; code?: string; kind: "Council" | "Committee";
  mandate?: string; mandate_reference?: string; established_date?: string;
  status: "Draft" | "Active" | "Inactive";
}): Promise<BarangayCouncil> {
  const supabase = await requireCouncilPermission("canEdit");
  const name = clean(input.name, 160);
  const reference = clean(input.mandate_reference, 1000);
  if (!name || name.length < 3) throw new Error("Enter a valid council name.");
  if (!["Council", "Committee"].includes(input.kind)) throw new Error("Invalid council type.");
  if (!["Draft", "Active", "Inactive"].includes(input.status)) throw new Error("Invalid status.");
  if (input.status === "Active" && !reference) {
    throw new Error("A verified ordinance, resolution or official authority reference is required before activating.");
  }
  const { data, error } = await supabase.from("barangay_councils").update({
    name, code: clean(input.code, 32), kind: input.kind,
    mandate: clean(input.mandate, 3000), mandate_reference: reference,
    established_date: input.established_date || null, status: input.status,
    updated_at: new Date().toISOString(),
  }).eq("id", input.id).select("*").single();
  if (error) throw new Error(error.message);
  revalidatePath("/councils");
  return data as BarangayCouncil;
}

export async function fetchCouncilMembers(councilId: string): Promise<CouncilMember[]> {
  const supabase = await requireCouncilPermission("canView");
  const { data, error } = await supabase.from("barangay_council_members")
    .select("*").eq("council_id", councilId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as CouncilMember[];
}

export async function addCouncilMember(input: {
  council_id: string; full_name: string; position: CouncilPosition;
  appointment_reference?: string; verification_status: "Pending" | "Verified";
  term_start?: string; term_end?: string; organization_id?: string;
}): Promise<CouncilMember> {
  const supabase = await requireCouncilPermission("canCreate");
  const fullName = clean(input.full_name, 160);
  const appointment = clean(input.appointment_reference, 1000);
  if (!fullName || fullName.length < 2) throw new Error("A member's full name is required.");
  if (!POSITIONS.includes(input.position)) throw new Error("Invalid council position.");
  if (!["Pending", "Verified"].includes(input.verification_status)) throw new Error("Invalid verification status.");
  if (input.verification_status === "Verified" && !appointment) {
    throw new Error("Official appointment/resolution reference is required to verify this role.");
  }
  if (input.term_start && input.term_end && input.term_end < input.term_start) {
    throw new Error("Term end must not precede term start.");
  }
  const { data, error } = await supabase.from("barangay_council_members").insert({
    council_id: input.council_id,
    full_name: fullName,
    position: input.position,
    appointment_reference: appointment,
    verification_status: input.verification_status,
    term_start: input.term_start || null,
    term_end: input.term_end || null,
    organization_id: input.organization_id || null,
  }).select("*").single();
  if (error) throw new Error(error.message);
  revalidatePath("/councils");
  return data as CouncilMember;
}

export async function removeCouncilMember(id: string): Promise<void> {
  const supabase = await requireCouncilPermission("canDelete");
  const { error } = await supabase.from("barangay_council_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/councils");
}

export async function fetchCouncilPrograms(councilId: string): Promise<CouncilProgram[]> {
  const supabase = await requireCouncilPermission("canView");
  const { data: links, error } = await supabase.from("barangay_council_programs")
    .select("council_id,program_id").eq("council_id", councilId);
  if (error) throw new Error(error.message);
  const ids = (links || []).map(x => x.program_id);
  if (!ids.length) return [];
  const { data: programs, error: programError } = await supabase.from("barangay_programs")
    .select("id,name").in("id", ids);
  if (programError) throw new Error(programError.message);
  const names = new Map((programs || []).map(x => [x.id, x.name]));
  return (links || []).map(x => ({
    council_id: x.council_id,
    program_id: x.program_id,
    program_name: names.get(x.program_id) || "Unavailable program",
  }));
}

export async function fetchCouncilProgramOptions(): Promise<CouncilProgramOption[]> {
  const supabase = await requireCouncilPermission("canView");
  const { data, error } = await supabase.from("barangay_programs")
    .select("id,name").order("name").limit(200);
  if (error) throw new Error(error.message);
  return (data || []) as CouncilProgramOption[];
}

export async function linkCouncilProgram(councilId: string, programId: string): Promise<void> {
  const supabase = await requireCouncilPermission("canEdit");
  const { error } = await supabase.from("barangay_council_programs")
    .upsert({ council_id: councilId, program_id: programId }, { onConflict: "council_id,program_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/councils");
}

export async function unlinkCouncilProgram(councilId: string, programId: string): Promise<void> {
  const supabase = await requireCouncilPermission("canEdit");
  const { error } = await supabase.from("barangay_council_programs")
    .delete().eq("council_id", councilId).eq("program_id", programId);
  if (error) throw new Error(error.message);
  revalidatePath("/councils");
}
