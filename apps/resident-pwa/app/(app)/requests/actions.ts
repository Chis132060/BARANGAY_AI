"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TOTAL_UPLOAD_SIZE = 20 * 1024 * 1024; // 20MB per request
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"];

async function validateFileSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const starts = (signature: number[]) => signature.every((byte, index) => bytes[index] === byte);
  if (file.type === "application/pdf") return starts([0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (file.type === "image/png") return starts([137, 80, 78, 71, 13, 10, 26, 10]);
  if (file.type === "image/jpeg") return starts([0xff, 0xd8, 0xff]);
  return false;
}


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
  const clientOperationId = formData.get("clientOperationId");
  if (clientOperationId !== null &&
      (typeof clientOperationId !== "string" ||
       !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clientOperationId))) {
    throw new Error("Invalid client operation identifier");
  }

  if (!documentTypeId || !purpose?.trim() || purpose.length > 2000) {
    throw new Error("Missing required fields");
  }

  let requirements: string[] = [];
  try {
    const parsed: unknown = JSON.parse(requirementsJson || "[]");
    if (!Array.isArray(parsed) || parsed.length > 20 || !parsed.every((req) => typeof req === "string" && req.length > 0 && req.length <= 120)) {
      throw new Error("Invalid requirements data");
    }
    if (new Set(parsed).size !== parsed.length) throw new Error("Duplicate attachment requirements");
    requirements = parsed;
  } catch {
    throw new Error("Invalid requirements data");
  }

  // Never trust cached/client-supplied attachment requirements: the database
  // catalog is authoritative on replay after an offline period.
  const { data: type, error: typeError } = await supabase.from("document_types")
    .select("requirements_json").eq("id", documentTypeId).single();
  if (typeError || !type) throw new Error("Document type not found. Refresh and try again.");
  const required = Array.isArray(type.requirements_json) ? type.requirements_json : [];
  if (required.length !== requirements.length ||
      !required.every((name: unknown) => typeof name === "string" && requirements.includes(name))) {
    throw new Error("Document requirements changed. Refresh and attach the current documents.");
  }

  if (clientOperationId) {
    const { data: existing, error: lookupError } = await supabase.from("document_requests")
      .select("id").eq("resident_id", resident.id).eq("client_operation_id", clientOperationId).maybeSingle();
    if (lookupError) throw new Error("Could not verify previous submission.");
    if (existing) return { success: true };
  }

  const attachments: { requirement: string; storage_path: string; mime_type: string; size: number }[] = [];

  // 3. Validate all files before any upload; roll back uploaded objects on later failure.
  const files: Array<{ requirement: string; file: File }> = [];
  let totalUploadSize = 0;
  for (const req of requirements) {
    const file = formData.get(`file_${req}`) as File | null;
    if (!(file instanceof File)) {
      throw new Error(`Missing required attachment: ${req}`);
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} must be non-empty and at most 5MB`);
    }

    totalUploadSize += file.size;
    if (totalUploadSize > MAX_TOTAL_UPLOAD_SIZE) {
      throw new Error("Combined attachments exceed the 20MB request limit");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      throw new Error(`Invalid file type for ${file.name}. Only PDF, JPG, and PNG are allowed.`);
    }

    // Verify extension to prevent spoofing
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      throw new Error(`Invalid file extension for ${file.name}`);
    }

    const expectedExtension: Record<string, string[]> = {
      "application/pdf": ["pdf"],
      "image/jpeg": ["jpg", "jpeg"],
      "image/png": ["png"],
    };
    if (!expectedExtension[file.type]?.includes(ext) || !(await validateFileSignature(file))) {
      throw new Error(`File content does not match the declared PDF/JPG/PNG format: ${file.name}`);
    }
    files.push({ requirement: req, file });
  }

  const uploadedPaths: string[] = [];
  try {
    for (const { requirement: req, file } of files) {
    const timestamp = crypto.randomUUID();
    const ext = file.name.split(".").pop()!.toLowerCase();
    const filePath = `${user.id}/req_${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("document-requirements")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload ${req}: ${uploadError.message}`);
    }

    uploadedPaths.push(filePath);
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
      client_operation_id: clientOperationId || null,
    });

  if (reqError) {
    if (reqError.code === "23505" && clientOperationId) {
      const { data: existing, error: lookupError } = await supabase.from("document_requests")
        .select("id").eq("resident_id", resident.id).eq("client_operation_id", clientOperationId).maybeSingle();
      if (!lookupError && existing) {
        // Uploads from this retry are unnecessary; delete them on duplicate receipt.
        if (uploadedPaths.length) await supabase.storage.from("document-requirements").remove(uploadedPaths);
        return { success: true };
      }
    }
    throw new Error(`Database error: ${reqError.message}`);
  }

  } catch (error) {
    if (uploadedPaths.length) {
      const { error: cleanupError } = await supabase.storage
        .from("document-requirements")
        .remove(uploadedPaths);
      if (cleanupError) console.error("Document upload rollback failed", cleanupError.message);
    }
    throw error;
  }

  revalidatePath("/requests");
  return { success: true };
}
