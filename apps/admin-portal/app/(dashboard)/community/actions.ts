"use server";

import { createClient } from "@/lib/supabase/server";

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
