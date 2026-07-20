"use server";

import { createClient } from "@/lib/supabase/server";

export interface DocumentRequestItem {
  id: string;
  resident_id: string;
  resident: {
    first_name: string;
    last_name: string;
  };
  document_type: {
    name: string;
  };
  status: "Pending" | "Under Review" | "Approved" | "Released" | "Completed" | "Rejected";
  remarks?: string;
  requested_date: string;
  released_date?: string;
}

export async function fetchDocumentRequests(statusFilter = "All"): Promise<DocumentRequestItem[]> {
  const supabase = createClient();
  
  let query = supabase
    .from("document_requests")
    .select(`
      id,
      resident_id,
      status,
      remarks,
      requested_date,
      released_date,
      resident:residents (
        first_name,
        last_name
      ),
      document_type:document_types (
        name
      )
    `);

  if (statusFilter !== "All") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching document requests:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as DocumentRequestItem[];
}

export async function updateRequestStatus(
  requestId: string,
  status: string,
  remarks = ""
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const updateFields: any = {
    status,
    remarks,
  };

  if (status === "Approved") {
    updateFields.approved_by = user?.id || null;
  } else if (status === "Released") {
    updateFields.released_date = new Date().toISOString();
  }

  const { error } = await supabase
    .from("document_requests")
    .update(updateFields)
    .eq("id", requestId);

  if (error) throw new Error(error.message);

  // Log transaction
  if (user) {
    await supabase.from("transactions").insert({
      user_id: user.id,
      module: "Documents",
      action: "Status Update",
      description: `Document request ${requestId} updated to ${status}.`,
    });
  }

  return { success: true };
}
