"use server";

import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../administration/rbac-actions";

export interface OfficialItem {
  id: string;
  resident_id: string;
  position: string;
  start_term: string;
  end_term?: string;
  status: "Active" | "Inactive";
  resident: {
    first_name: string;
    last_name: string;
  };
}

export interface PurokItem {
  id: string;
  name: string;
  leader_id?: string;
  leader?: {
    first_name: string;
    last_name: string;
  };
}

export interface PrecinctItem {
  id: string;
  number: string;
  location?: string;
}

export async function fetchOfficials(): Promise<OfficialItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("officials")
    .select(`
      id,
      resident_id,
      position,
      start_term,
      end_term,
      status,
      resident:residents (
        first_name,
        last_name
      )
    `);

  if (error) {
    console.error("Error fetching officials:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as OfficialItem[];
}

export async function createOfficial(formData: {
  resident_id: string;
  position: string;
  start_term: string;
  end_term?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "community", "canCreate"))) throw new Error("Insufficient permissions to create an official record");

  const { error } = await supabase
    .from("officials")
    .insert({
      resident_id: formData.resident_id,
      position: formData.position,
      start_term: formData.start_term,
      end_term: formData.end_term || null,
      status: "Active",
    });

  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "CREATE_OFFICIAL", module: "community", details: formData });
  return { success: true };
}

export async function createPurok(name: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "community", "canCreate"))) throw new Error("Insufficient permissions to create a purok");
  const { error } = await supabase.from("puroks").insert({ name: name.trim() });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "CREATE_PUROK", module: "community", details: { name: name.trim() } });
  return { success: true };
}

export async function createPrecinct(number: string, location?: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "community", "canCreate"))) throw new Error("Insufficient permissions to create a precinct");
  const { error } = await supabase.from("precincts").insert({ number: number.trim(), location: location?.trim() || null });
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "CREATE_PRECINCT", module: "community", details: { number: number.trim(), location } });
  return { success: true };
}

export async function fetchPuroks(): Promise<PurokItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("puroks")
    .select(`
      id,
      name,
      leader_id,
      leader:residents (
        first_name,
        last_name
      )
    `);

  if (error) {
    console.error("Error fetching puroks:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as PurokItem[];
}

export async function fetchPrecincts(): Promise<PrecinctItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("precincts")
    .select("id, number, location");

  if (error) {
    console.error("Error fetching precincts:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as PrecinctItem[];
}
