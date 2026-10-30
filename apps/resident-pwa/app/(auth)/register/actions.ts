"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { validateRegistrationInput, validateIdFile } = require("../../../lib/registration-validation.cjs");
const { inspectImage } = require("../../../lib/id-image-validation.cjs");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function detectedImageExtension(bytes: Buffer): "jpg" | "png" | "webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function registerResidentAction(formData: FormData): Promise<{ success?: boolean; error?: string; emailWarning?: string }> {
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
    const householdCode = String(formData.get("householdCode") || "").trim();
    const idType = formData.get("idType") as string;
    const idBlob = formData.get("idBlob") as Blob | null;

    if (!email || !password || !firstName || !lastName || !birthDate || !idBlob) {
      return { error: "Missing required fields." };
    }

    const inputErrors = validateRegistrationInput({ email, password, firstName, lastName, birthDate, contactNumber, street, purok, idType });
    if (inputErrors.length) return { error: inputErrors[0] };
    if (householdCode.length > 80) return { error: "Household code is too long." };
    const fileErrors = validateIdFile({ type: idBlob.type, size: idBlob.size });
    if (fileErrors.length) return { error: fileErrors[0] };

    if (!ALLOWED_MIME_TYPES.includes(idBlob.type)) {
      return { error: "Invalid image format. Only JPEG, PNG, and WEBP are allowed." };
    }

    if (idBlob.size === 0 || idBlob.size > MAX_FILE_SIZE) {
      return { error: "Image size exceeds 5MB limit." };
    }

    const idBytes = Buffer.from(await idBlob.arrayBuffer());
    try {
      inspectImage(idBytes, idBlob.type);
    } catch (imageError) {
      return { error: imageError instanceof Error ? imageError.message : "Invalid identification image." };
    }
    const extension = detectedImageExtension(idBytes);
    const expectedExtension = idBlob.type === "image/jpeg" ? "jpg" : idBlob.type === "image/png" ? "png" : "webp";
    if (extension !== expectedExtension) {
      return { error: "Identification image content does not match its file format." };
    }

    const supabase = createAdminClient();
    let requestedHouseholdId: string | null = null;
    if (householdCode) {
      const { data: requestedHousehold, error: householdError } = await supabase
        .from("households").select("id").eq("household_number", householdCode).maybeSingle();
      if (householdError) return { error: "Could not check the household code. Please try again." };
      if (!requestedHousehold) return { error: "Household code not found. Check it with your household head or Barangay staff." };
      requestedHouseholdId = requestedHousehold.id;

      const { data: memberships, error: membershipError } = await supabase.from("household_members")
        .select("resident:residents!inner(id,user_id,first_name,middle_name,last_name,birth_date,verification_status)")
        .eq("household_id", requestedHouseholdId);
      if (membershipError) return { error: "Could not check household resident records. Please try again." };
      const normalizeName = (value: unknown) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
      const hasVerifiedUnlinkedMatch = (memberships || []).some((membership: any) => {
        const record = Array.isArray(membership.resident) ? membership.resident[0] : membership.resident;
        return record && !record.user_id && record.verification_status === "Verified"
          && normalizeName(record.first_name) === normalizeName(firstName)
          && normalizeName(record.middle_name) === normalizeName(middleName)
          && normalizeName(record.last_name) === normalizeName(lastName)
          && String(record.birth_date).slice(0, 10) === birthDate;
      });
      if (hasVerifiedUnlinkedMatch) {
        return { error: "A verified household record matches these details. Please contact Barangay staff to link your account and prevent a duplicate resident record." };
      }
    }

    // 1. Create a new account only. Existing accounts must authenticate through
    // the normal login/recovery flow; public registration must never adopt them.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        role: "Resident",
        full_name: `${firstName} ${lastName}`.trim(),
        ...(householdCode ? { household_code: householdCode } : {}),
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
      const fileName = `id_capture_${uuidv4()}.${extension}`;
      const storagePath = `${authUserId}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("resident-ids")
        .upload(storagePath, idBytes, { contentType: idBlob.type, upsert: false });
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

      let matchedResidentId: string | null = null;
      if (requestedHouseholdId) {
        const { data: memberships, error: membershipError } = await supabase.from("household_members")
          .select("resident:residents!inner(id,user_id,first_name,middle_name,last_name,birth_date,verification_status)")
          .eq("household_id", requestedHouseholdId);
        if (membershipError) throw new Error("Unable to check household family records.");
        const normalizeName = (value: unknown) => String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
        const matchingResidents = (memberships || []).flatMap((membership: any) => {
          const record = Array.isArray(membership.resident) ? membership.resident[0] : membership.resident;
          if (!record || record.user_id || record.verification_status !== "Pending") return [];
          const matches = normalizeName(record.first_name) === normalizeName(firstName)
            && normalizeName(record.middle_name) === normalizeName(middleName)
            && normalizeName(record.last_name) === normalizeName(lastName)
            && String(record.birth_date).slice(0, 10) === birthDate;
          return matches ? [record] : [];
        });
        if (matchingResidents.length > 1) throw new Error("More than one family record matches your details. Please ask Barangay staff to review it.");
        matchedResidentId = matchingResidents[0]?.id || null;
      }

      const residentId = matchedResidentId || (await supabase.from("residents").insert({
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
      }).select("id").single()).data?.id;
      if (!residentId) throw new Error("Unable to create resident profile.");

      const { error: addressError } = await supabase.from("addresses").upsert({
        resident_id: residentId,
        house_number: houseNumber || null,
        street: street || null,
        purok: purok || "Purok 1",
      }, { onConflict: "resident_id" });
      if (addressError) throw new Error("Unable to save residential address.");

      if (matchedResidentId) {
        const { data: linkedResident, error: linkError } = await supabase.from("residents").update({
          user_id: authUserId,
          email,
          contact_number: contactNumber || null,
          id_type: idType,
          id_photo_url: storagePath,
          updated_at: new Date().toISOString(),
        }).eq("id", matchedResidentId).is("user_id", null).eq("verification_status", "Pending").select("id").maybeSingle();
        if (linkError || !linkedResident) throw new Error("That family record was linked by another registration. Please contact Barangay staff.");
      }
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

    // Admin-created accounts do not automatically send a signup confirmation.
    // Request one only after the resident profile and ID upload are committed.
    const { error: confirmationError } = await supabase.auth.resend({ type: "signup", email });
    if (confirmationError) {
      console.error("Resident confirmation email could not be sent", { authUserId, message: confirmationError.message });
      return { success: true, emailWarning: "Your registration was saved, but we could not send the confirmation email. Please contact barangay support before trying to register again." };
    }
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to register resident" };
  }
}
