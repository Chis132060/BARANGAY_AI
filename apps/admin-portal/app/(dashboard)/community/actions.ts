"use server";

import { createClient } from "@/lib/supabase/server";

export interface PurokStats {
  purok_id: string;
  name: string;
  leader_name: string | null;
  household_count: number;
  resident_count: number;
}

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

export async function fetchPurokStats(): Promise<PurokStats[]> {
  const supabase = createClient();

  // Fetch puroks with leader info
  const { data: puroks, error: purokErr } = await supabase
    .from("puroks")
    .select(`id, name, leader_id, leader:residents(first_name, last_name)`);

  if (purokErr || !puroks) return [];

  // For each purok, count households and residents linked via addresses.purok_id
  const stats = await Promise.all(
    puroks.map(async (p: any) => {
      const { count: householdCount } = await supabase
        .from("addresses")
        .select("*", { count: "exact", head: true })
        .eq("purok_id", p.id);

      const { count: residentCount } = await supabase
        .from("residents")
        .select("addresses!inner(*)", { count: "exact", head: true })
        .eq("addresses.purok_id", p.id);

      const leaderName = p.leader
        ? `${p.leader.first_name} ${p.leader.last_name}`
        : null;

      return {
        purok_id: p.id,
        name: p.name,
        leader_name: leaderName,
        household_count: householdCount || 0,
        resident_count: residentCount || 0,
      } as PurokStats;
    })
  );

  return stats;
}

export async function savePurok(
  id: string | null,
  name: string,
  leaderId?: string | null
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (id) {
    const { error } = await supabase
      .from("puroks")
      .update({ name, leader_id: leaderId || null })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("puroks")
      .insert({ name, leader_id: leaderId || null });
    if (error) throw new Error(error.message);
  }

  await supabase.from("transactions").insert({
    user_id: user.id,
    module: "Purok",
    action: id ? "Update" : "Create",
    description: `Purok "${name}" ${id ? "updated" : "created"}.`,
  });

  return { success: true };
}
