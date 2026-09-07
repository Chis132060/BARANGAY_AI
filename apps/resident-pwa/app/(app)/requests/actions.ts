"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export async function submitDocumentRequest(formData: FormData) {
  const supabase = createClient();

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  // 2. Fetch the authenticated resident's UUID from residents table
  const { data: resident, error: resError } = await supabase
    .from("residents")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (resError || !resident) {
    throw new Error("Resident profile not found. Please complete your registration first.");
  }

  const documentTypeId = formData.get("documentTypeId") as string;
  const purpose = formData.get("purpose") as string;
  const requirementsJson = formData.get("requirements") as string;

  if (!documentTypeId || !purpose) {
    throw new Error("Missing required fields");
  }

  let requirements: string[] = [];
  try {
    requirements = JSON.parse(requirementsJson || "[]");
  } catch (e) {
    throw new Error("Invalid requirements data");
  }

  const attachments: { requirement: string; storage_path: string; mime_type: string; size: number }[] = [];

  // 3. Validate and upload each requirement
  for (const req of requirements) {
    const file = formData.get(`file_${req}`) as File | null;
    if (!file) {
      throw new Error(`Missing required attachment: ${req}`);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} exceeds 5MB limit`);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type for ${file.name}. Only PDF, JPG, and PNG are allowed.`);
    }

    // Verify extension to prevent spoofing
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      throw new Error(`Invalid file extension for ${file.name}`);
    }

    const timestamp = Date.now();
    const filePath = `${user.id}/req_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    const { error: uploadError } = await supabase.storage
      .from("document-requirements")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload ${req}: ${uploadError.message}`);
    }

    attachments.push({
      requirement: req,
      storage_path: `document-requirements/${filePath}`,
      mime_type: file.type,
      size: file.size,
    });
  }

  // 4. Insert document request using resident.id (residents table UUID, not auth UID)
  const { error: reqError } = await supabase
    .from("document_requests")
    .insert({
      resident_id: resident.id,
      document_type_id: documentTypeId,
      status: "Pending",
      remarks: purpose,
      requested_date: new Date().toISOString(),
      form_data: { attachments },
    });

  if (reqError) {
    throw new Error(`Database error: ${reqError.message}`);
  }

  revalidatePath("/requests");
  return { success: true };
}
