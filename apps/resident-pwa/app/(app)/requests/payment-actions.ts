"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitPaymentReference(requestId: string, referenceNumber: string) {
  const supabase = createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch the request to verify ownership and amount
  const { data: request, error: reqError } = await supabase
    .from("document_requests")
    .select("resident_id, fee_amount, payment_status")
    .eq("id", requestId)
    .single();

  if (reqError || !request) {
    throw new Error("Request not found");
  }

  if (request.resident_id !== user.id) {
    throw new Error("Unauthorized access to this request");
  }

  if (request.payment_status === "Paid" || request.payment_status === "Pending") {
    throw new Error(`Payment is already ${request.payment_status}`);
  }

  const amount = request.fee_amount || 0;
  if (amount <= 0) {
    throw new Error("This request is free");
  }

  // 3. Insert into payments table (Idempotent because of unique constraint request_id + reference_number)
  const { error: paymentError } = await supabase
    .from("payments")
    .insert({
      request_id: requestId,
      resident_id: user.id,
      amount: amount,
      provider: "QR_PAY",
      reference_number: referenceNumber,
      status: "Pending",
    });

  if (paymentError) {
    // Handle uniqueness violation (23505) gracefully
    if (paymentError.code === "23505") {
      throw new Error("This reference number has already been submitted or you already have a pending payment.");
    }
    throw new Error(`Failed to submit payment: ${paymentError.message}`);
  }

  // 4. Update request status
  const { error: updateError } = await supabase
    .from("document_requests")
    .update({ payment_status: "Pending" })
    .eq("id", requestId);

  if (updateError) {
    throw new Error("Payment recorded but failed to update request status.");
  }

  revalidatePath("/requests");
  return { success: true };
}
