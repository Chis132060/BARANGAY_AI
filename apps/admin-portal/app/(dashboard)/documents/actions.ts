"use server";

import { createClient } from "@/lib/supabase/server";

export interface DocumentRequestItem {
  id: string;
  resident_id: string;
  resident?: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    civil_status?: string;
    contact_number?: string;
    user_id?: string;
    addresses?: {
      house_number?: string;
      street?: string;
      purok?: string;
    }[];
  };
  document_type?: {
    name: string;
    description?: string;
  };
  status: "Pending" | "Under Review" | "Approved" | "Ready for Pickup" | "Released" | "Completed" | "Rejected";
  fee_amount: number;
  payment_status: "Unpaid" | "Paid" | "Waived" | "Free";
  session_id?: string;
  form_data?: Record<string, any>;
  remarks?: string;
  pickup_date?: string;
  pickup_instructions?: string;
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
      fee_amount,
      payment_status,
      session_id,
      form_data,
      pickup_date,
      pickup_instructions,
      remarks,
      requested_date,
      released_date,
      resident:residents (
        first_name,
        middle_name,
        last_name,
        civil_status,
        contact_number,
        user_id,
        addresses (
          house_number,
          street,
          purok
        )
      ),
      document_type:document_types (
        name,
        description
      )
    `)
    .order("requested_date", { ascending: false });

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
  remarks = "",
  customFee?: number,
  paymentStatus?: "Unpaid" | "Paid" | "Waived" | "Free",
  pickupInstructions?: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch current request details to get resident and document info
  const { data: existingReq } = await supabase
    .from("document_requests")
    .select(`
      id,
      resident_id,
      document_type:document_types(name),
      resident:residents(user_id, first_name, last_name)
    `)
    .eq("id", requestId)
    .single();

  const updateFields: any = {
    status,
    remarks: remarks || undefined,
  };

  if (customFee !== undefined) {
    updateFields.fee_amount = customFee;
  }
  if (paymentStatus) {
    updateFields.payment_status = paymentStatus;
  }
  if (pickupInstructions) {
    updateFields.pickup_instructions = pickupInstructions;
  }

  if (status === "Approved") {
    updateFields.approved_by = user?.id || null;
  } else if (status === "Ready for Pickup") {
    updateFields.approved_by = user?.id || null;
    updateFields.pickup_date = new Date().toISOString();
  } else if (status === "Released" || status === "Completed") {
    updateFields.released_date = new Date().toISOString();
  }

  const { error } = await supabase
    .from("document_requests")
    .update(updateFields)
    .eq("id", requestId);

  if (error) throw new Error(error.message);

  // Send resident notification if user_id is linked
  const residentUserId = (existingReq as any)?.resident?.user_id;
  const docName = (existingReq as any)?.document_type?.name || "Document";

  if (residentUserId) {
    let notifTitle = `Document Request ${status}`;
    let notifMsg = `Your request for ${docName} has been updated to "${status}".`;

    if (status === "Ready for Pickup") {
      const feeNote = customFee !== undefined && customFee > 0
        ? `Payment required: ₱${customFee.toFixed(2)} (${paymentStatus || "Unpaid"}).`
        : "Fee: FREE.";
      const instrNote = pickupInstructions || "Please proceed to Barangay Hall Frontline Window 2 with 1 Valid ID.";
      notifTitle = `Ready for Pick Up: ${docName}`;
      notifMsg = `Your ${docName} is ready for pick up at the Barangay Hall. ${instrNote} ${feeNote}`;
    } else if (status === "Approved") {
      notifTitle = `Approved: ${docName}`;
      notifMsg = `Your request for ${docName} has been approved by the Barangay Office.`;
    } else if (status === "Rejected") {
      notifTitle = `Update on ${docName}`;
      notifMsg = `Your request for ${docName} could not be processed. Reason: ${remarks || "Requirements incomplete."}`;
    }

    await supabase.from("notifications").insert({
      user_id: residentUserId,
      title: notifTitle,
      message: notifMsg,
      read_status: false,
    });
  }

  // Audit transaction log
  if (user) {
    await supabase.from("transactions").insert({
      user_id: user.id,
      module: "Documents",
      action: "Status Update",
      description: `Document request ${requestId} (${docName}) updated to ${status}.`,
    });
  }

  return { success: true };
}
