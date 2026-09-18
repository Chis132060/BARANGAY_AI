"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { v4 as uuidv4 } from "uuid";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function registerResidentAction(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  try {
    const email = formData.get("email") as string;
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

    const supabase = createAdminClient();

    // 1. Create or retrieve auth user with auto-confirmation
    let authUserId: string;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "Resident",
        full_name: `${firstName} ${lastName}`.trim(),
      },
    });

    if (authError) {
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already been registered")
      ) {
        const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
        const existingUser = usersPage?.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
        if (existingUser) {
          authUserId = existingUser.id;
        } else {
          return { error: "An account with this email already exists. Please log in or use another email." };
        }
      } else {
        return { error: authError.message };
      }
    } else {
      authUserId = authData.user.id;
    }

    // 2. Upload ID Blob securely
    const fileName = `id_capture_${uuidv4()}.jpg`;
    const storagePath = `${authUserId}/${fileName}`;
    const arrayBuffer = await idBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("resident-ids")
      .upload(storagePath, buffer, {
        contentType: idBlob.type,
        upsert: false,
      });

    if (uploadError) {
      return { error: `Failed to secure upload ID: ${uploadError.message}` };
    }

    // 3. Lookup Resident role
    const { data: residentRole } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "Resident")
      .maybeSingle();

    const roleId = residentRole?.id;

    // 4. Upsert user in public.users table
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const { data: existingUserRow } = await supabase
      .from("users")
      .select("id")
      .eq("id", authUserId)
      .maybeSingle();

    if (existingUserRow) {
      await supabase
        .from("users")
        .update({
          name: fullName,
          email,
          role_id: roleId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUserId);
    } else {
      await supabase.from("users").insert({
        id: authUserId,
        name: fullName,
        email,
        role_id: roleId,
        updated_at: new Date().toISOString(),
      });
    }

    // 5. Safe insert or update in residents table
    const { data: existingResident } = await supabase
      .from("residents")
      .select("id")
      .or(`user_id.eq.${authUserId},email.eq.${email}`)
      .maybeSingle();

    let residentId: string;
    const residentPayload = {
      user_id: authUserId,
      email,
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      birth_date: birthDate,
      gender: gender,
      contact_number: contactNumber || null,
      civil_status: "Single",
      verification_status: "Pending",
      id_type: idType,
      id_photo_url: storagePath, // We now store the private storage path here.
      updated_at: new Date().toISOString(),
    };

    if (existingResident) {
      const { error: updateError } = await supabase
        .from("residents")
        .update(residentPayload)
        .eq("id", existingResident.id);

      if (updateError) return { error: updateError.message };
      residentId = existingResident.id;
    } else {
      const { data: newResident, error: insertError } = await supabase
        .from("residents")
        .insert(residentPayload)
        .select("id")
        .single();

      if (insertError) return { error: insertError.message };
      residentId = newResident.id;
    }

    // 6. Safe insert or update address
    const { data: existingAddress } = await supabase
      .from("addresses")
      .select("id")
      .eq("resident_id", residentId)
      .maybeSingle();

    const addressPayload = {
      resident_id: residentId,
      house_number: houseNumber || null,
      street: street || null,
      purok: purok || "Purok 1",
    };

    if (existingAddress) {
      await supabase
        .from("addresses")
        .update(addressPayload)
        .eq("id", existingAddress.id);
    } else {
      await supabase
        .from("addresses")
        .insert(addressPayload);
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to register resident" };
  }
}
