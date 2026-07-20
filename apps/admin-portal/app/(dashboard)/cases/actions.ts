"use server";

import { createClient } from "@/lib/supabase/server";

export interface ComplaintItem {
  id: string;
  complainant_id: string;
  respondent_id?: string;
  category: "Peace and Order" | "Noise Complaint" | "Garbage" | "Safety Issue" | "Infrastructure" | "Other";
  description: string;
  status: "Filed" | "Investigation" | "Hearing" | "Settlement" | "Closed";
  created_at: string;
  complainant: {
    first_name: string;
    last_name: string;
  };
  respondent?: {
    first_name: string;
    last_name: string;
  };
}

export async function fetchComplaints(statusFilter = "All"): Promise<ComplaintItem[]> {
  const supabase = createClient();
  
  let query = supabase
    .from("complaints")
    .select(`
      id,
      complainant_id,
      respondent_id,
      category,
      description,
      status,
      created_at,
      complainant:residents!complaints_complainant_id_fkey (
        first_name,
        last_name
      ),
      respondent:residents!complaints_respondent_id_fkey (
        first_name,
        last_name
      )
    `);

  if (statusFilter !== "All") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching complaints:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as ComplaintItem[];
}

export async function createComplaint(formData: {
  complainant_id: string;
  respondent_id?: string;
  category: string;
  description: string;
}) {
  const supabase = createClient();

  const { error } = await supabase
    .from("complaints")
    .insert({
      complainant_id: formData.complainant_id,
      respondent_id: formData.respondent_id || null,
      category: formData.category,
      description: formData.description,
      status: "Filed",
    });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function updateComplaintStatus(complaintId: string, status: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("complaints")
    .update({ status })
    .eq("id", complaintId);

  if (error) throw new Error(error.message);
  return { success: true };
}
