"use server";

import { createClient } from "@/lib/supabase/server";

export interface BarangayPolicy {
  id: string;
  title: string;
  content: string;
  status: "Draft" | "Published" | "Archived";
  created_at: string;
  updated_at: string;
}

export async function fetchPolicies(): Promise<BarangayPolicy[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("barangay_policies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching policies:", error);
    return [];
  }
  return data as BarangayPolicy[];
}

export async function savePolicy(id: string | null, title: string, content: string, status: "Draft" | "Published" | "Archived") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  if (id) {
    const { error } = await supabase
      .from("barangay_policies")
      .update({ title, content, status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("barangay_policies")
      .insert([{ title, content, status }]);
    if (error) throw new Error(error.message);
  }

  // Audit transaction log
  await supabase.from("transactions").insert({
    user_id: user.id,
    module: "Policies",
    action: id ? "Update" : "Create",
    description: `Policy "${title}" ${id ? "updated" : "created"} as ${status}.`,
  });

  return { success: true };
}
