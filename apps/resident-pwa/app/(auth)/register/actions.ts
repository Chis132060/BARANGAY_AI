"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMockSupabaseEnabled } from "@/lib/supabase/config";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function registerResidentAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const email = (formData.get("email") as string | null)?.trim().toLowerCase() ?? "";
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;
    const middleName = formData.get("middleName") as string;
    const lastName = formData.get("lastName") as string;
    const birthDate = formData.get("birthDate") as string;
    const gender = formData.get("gender") as string;
    const contactNumber = formData.get("contactNumber") as string;
    const houseNumber = formData.get("houseNumber") as string;
    const street = formData.get("street") as string;
    const purok = formData.get("purok") as string;
    const idType = formData.get("idType") as string;
    const idBlob = formData.get("idBlob") as Blob | null;

    if (!email || !password || !firstName || !lastName || !birthDate || !idBlob) {
      return { error: "Missing required fields." };
    }

    if (!ALLOWED_MIME_TYPES.includes(idBlob.type)) {
      return { error: "Invalid image format. Only JPEG, PNG, and WEBP are allowed." };
    }

    if (idBlob.size > MAX_FILE_SIZE) {
      return { error: "Image size exceeds 5MB limit." };
    }

    // Local development uses a placeholder Supabase URL. Keep the full form
    // validation above, but do not attempt a network call until real Supabase
    // credentials are configured.
    if (isMockSupabaseEnabled()) {
      if (process.env.NODE_ENV === "production") {
        return { error: "Registration is temporarily unavailable. Please contact support." };
      }
      return { success: true };
    }

    const supabase = createAdminClient();

    // 1. Create a new account only. Existing accounts must authenticate through
    // the normal login/recovery flow; public registration must never adopt them.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        role: "Resident",
        full_name: `${firstName} ${lastName}`.trim(),
      },
    });

    if (authError) {
      if (/already (been )?registered|already exists/i.test(authError.message)) {
        return { error: "An account with this email already exists. Please log in or recover your account." };
      }
      return { error: "Unable to create account. Please try again." };
    }
    if (!authData?.user?.id) {
      return { error: "Unable to create account. Please try again." };
    }
    const authUserId = authData.user.id;

    // Every resource below belongs to this newly-created auth user.
    // Compensate for partial failures so registration can be safely retried.
    let uploadedPath: string | null = null;
    try {
      const fileName = `id_capture_${uuidv4()}.jpg`;
      const storagePath = `${authUserId}/${fileName}`;
      const buffer = Buffer.from(await idBlob.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("resident-ids")
        .upload(storagePath, buffer, { contentType: idBlob.type, upsert: false });
      if (uploadError) throw new Error("Unable to upload identification document.");
      uploadedPath = storagePath;

      const { data: residentRole, error: roleError } = await supabase
        .from("roles").select("id").eq("name", "Resident").single();
      if (roleError || !residentRole) throw new Error("Resident role is not configured.");

      const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
      const { error: userError } = await supabase.from("users").insert({
        id: authUserId,
        name: fullName,
        email,
        role_id: residentRole.id,
        updated_at: new Date().toISOString(),
      });
      if (userError) throw new Error("Unable to create user profile.");

      const { data: resident, error: residentError } = await supabase
        .from("residents")
        .insert({
          user_id: authUserId,
          email,
          first_name: firstName,
          middle_name: middleName || null,
          last_name: lastName,
          birth_date: birthDate,
          gender,
          contact_number: contactNumber || null,
          civil_status: "Single",
          verification_status: "Pending",
          id_type: idType,
          id_photo_url: storagePath,
          updated_at: new Date().toISOString(),
        })
        .select("id").single();
      if (residentError || !resident) throw new Error("Unable to create resident profile.");

      const { error: addressError } = await supabase.from("addresses").insert({
        resident_id: resident.id,
        house_number: houseNumber || null,
        street: street || null,
        purok: purok || "Purok 1",
      });
      if (addressError) throw new Error("Unable to save residential address.");
    } catch (registrationError) {
      if (uploadedPath) {
        await supabase.storage.from("resident-ids").remove([uploadedPath]);
      }
      // residents.user_id is ON DELETE CASCADE; deleting the new auth identity
      // rolls back dependent profiles in schemas with cascading foreign keys.
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(authUserId);
      if (cleanupError) {
        console.error("Registration cleanup failed; manual review required", { authUserId, cleanupError });
        return { error: "Registration could not finish. Please contact support before retrying." };
      }
      console.error("Resident registration failed", registrationError);
      return { error: "Registration could not be completed. Please try again." };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to register resident" };
  }
}
