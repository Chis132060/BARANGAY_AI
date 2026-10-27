"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function submitPaymentReference(requestId: string, referenceNumber: string) {
  const supabase = createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }
  const normalizedReference = referenceNumber.trim();
  if (!requestId || normalizedReference.length < 3 || normalizedReference.length > 100 || /[\u0000-\u001f\u007f]/.test(normalizedReference)) {
    throw new Error("Enter a valid payment reference (3–100 characters).");
  }

  // A server-only RPC checks ownership and writes both records in one transaction.
  const admin = createAdminClient();
  const { error } = await admin.rpc("submit_document_payment", {
    p_user_id: user.id,
    p_request_id: requestId,
    p_reference_number: normalizedReference,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/requests");
  return { success: true };
}
