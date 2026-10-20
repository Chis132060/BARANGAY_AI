"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ProgramEnrollee {
  id: string;
  program_id: string;
  resident_id?: string;
  full_name: string;
  contact_number?: string;
  purok?: string;
  role?: string; // e.g. "Member", "Officer", "Coordinator"
  date_enrolled: string;
  status: string;
  notes?: string;
  rejection_reason?: string;
  attended?: boolean;
  reviewed_at?: string;
  created_at: string;
}

export interface BarangayProgram {
  id: string;
  name: string;
  code?: string;
  description?: string;
  image_url?: string | null;
  category: string;
  is_custom: boolean;
  chairperson?: string;
  contact?: string;
  established_date?: string;
  status: string;
  purok?: string;
  venue?: string;
  schedule_details?: string;
  is_public?: boolean;
  registration_open?: boolean;
  requirements?: string;
  registration_deadline?: string | null;
  registration_opens_at?: string | null;
  event_start_at?: string | null;
  event_end_at?: string | null;
  max_participants?: number | null;
  min_age?: number | null;
  max_age?: number | null;
  archived_at?: string | null;
  enrollee_count?: number;
  created_at: string;
}

export async function fetchPrograms(): Promise<BarangayProgram[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barangay_programs")
    .select("*, enrollee_count:program_enrollees(count)")
    .order("is_custom", { ascending: true })
    .order("name");

  if (error) {
    console.error("Error fetching programs:", error.message);
    throw new Error(error.message);
  }

  return (data || []).map((p: any) => ({
    ...p,
    enrollee_count: p.enrollee_count?.[0]?.count ?? 0,
  })) as BarangayProgram[];
}

export async function fetchProgramById(programId: string): Promise<BarangayProgram | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barangay_programs")
    .select("*")
    .eq("id", programId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as BarangayProgram | null;
}

export async function fetchEnrollees(programId: string): Promise<ProgramEnrollee[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("program_enrollees")
    .select("*")
    .eq("program_id", programId)
    .order("date_enrolled", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as ProgramEnrollee[];
}

export async function createProgram(
  formData: Omit<BarangayProgram, "id" | "created_at" | "enrollee_count">
): Promise<{ success: boolean; id: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barangay_programs")
    .insert({
      name: formData.name,
      code: formData.code || null,
      description: formData.description || null,
      image_url: formData.image_url || null,
      category: formData.category,
      is_custom: formData.is_custom,
      chairperson: formData.chairperson || null,
      contact: formData.contact || null,
      established_date: formData.established_date || null,
      status: formData.status || "Active",
      purok: formData.purok || "All Puroks",
      venue: formData.venue || null,
      schedule_details: formData.schedule_details || null,
      is_public: false,
      registration_open: false,
      requirements: formData.requirements || null,
      registration_deadline: formData.registration_deadline || null,
      registration_opens_at: formData.registration_opens_at || null,
      event_start_at: formData.event_start_at || null,
      event_end_at: formData.event_end_at || null,
      max_participants: formData.max_participants || null,
      min_age: formData.min_age ?? null,
      max_age: formData.max_age ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success: true, id: data.id };
}

export async function addEnrollee(
  formData: Omit<ProgramEnrollee, "id" | "created_at">
): Promise<{ success: boolean; id: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("program_enrollees")
    .insert({
      program_id: formData.program_id,
      resident_id: formData.resident_id || null,
      full_name: formData.full_name,
      contact_number: formData.contact_number || null,
      purok: formData.purok || null,
      role: formData.role || "Member",
      date_enrolled: formData.date_enrolled,
      status: formData.status || "Active",
      notes: formData.notes || null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success: true, id: data.id };
}

export async function removeEnrollee(enrolleeId: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from("program_enrollees").delete().eq("id", enrolleeId);
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success: true };
}

export async function deleteProgram(programId: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { error } = await supabase.from("barangay_programs").delete().eq("id", programId);
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success: true };
}

export async function setProgramPublication(programId: string, publish: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await supabase.from("barangay_programs").update({ is_public: publish }).eq("id", programId);
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success: true };
}

export async function reviewProgramApplication(enrolleeId: string, decision: "Approved" | "Rejected", reason = "") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await supabase.rpc("review_barangay_program_application", { p_enrollee_id: enrolleeId, p_decision: decision, p_reason: reason });
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success: true };
}

export async function updateProgramRegistration(programId: string, registrationOpen: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await supabase.from("barangay_programs").update({ registration_open: registrationOpen }).eq("id", programId);
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success: true };
}

export async function editProgram(programId: string, updates: Partial<BarangayProgram>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const allowed = ["name","description","image_url","category","purok","venue","schedule_details","requirements","chairperson","contact","status","registration_deadline","registration_opens_at","event_start_at","event_end_at","max_participants","min_age","max_age"] as const;
  const payload: Record<string, unknown> = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(updates,key)) payload[key] = updates[key] === "" ? null : updates[key];
  if (updates.status && updates.status !== "Active") { payload.registration_open = false; payload.is_public = false; }
  const { error } = await supabase.from("barangay_programs").update(payload).eq("id",programId);
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success:true };
}
export async function archiveProgram(programId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { error } = await supabase.from("barangay_programs").update({status:"Archived",archived_at:new Date().toISOString(),registration_open:false,is_public:false}).eq("id",programId);
  if (error) throw new Error(error.message);
  revalidatePath("/programs");
  return { success:true };
}
export async function setProgramAttendance(enrolleeId: string, attended: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data, error } = await supabase.from("program_enrollees").update({attended,attended_at:attended?new Date().toISOString():null}).eq("id",enrolleeId).in("status",["Approved","Active"]).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only approved participants can be marked present");
  revalidatePath("/programs");
  return {success:true};
}
export async function fetchProgramAudit(programId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("program_activity_logs").select("action,details,created_at,actor_id").eq("program_id",programId).order("created_at",{ascending:false}).limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}
