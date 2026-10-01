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
  created_at: string;
}

export interface BarangayProgram {
  id: string;
  name: string;
  code?: string;
  description?: string;
  category: string;
  is_custom: boolean;
  chairperson?: string;
  contact?: string;
  established_date?: string;
  status: string;
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
      category: formData.category,
      is_custom: formData.is_custom,
      chairperson: formData.chairperson || null,
      contact: formData.contact || null,
      established_date: formData.established_date || null,
      status: formData.status || "Active",
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
