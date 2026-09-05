"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface RegisterInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthDate: string;
  gender: string;
  contactNumber?: string;
  houseNumber?: string;
  street?: string;
  purok?: string;
  email: string;
  password: string;
  idType: string;
  idPhotoUrl?: string;
}

export async function registerResidentAction(input: RegisterInput): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Create or retrieve auth user with auto-confirmation
    let authUserId: string;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        role: "Resident",
        full_name: `${input.firstName} ${input.lastName}`.trim(),
      },
    });

    if (authError) {
      if (
        authError.message.toLowerCase().includes("already registered") ||
        authError.message.toLowerCase().includes("already been registered")
      ) {
        const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
        const existingUser = usersPage?.users.find((u) => u.email?.toLowerCase() === input.email.toLowerCase());
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

    // 2. Lookup Resident role
    const { data: residentRole } = await supabase
      .from("roles")
      .select("id")
      .eq("name", "Resident")
      .maybeSingle();

    const roleId = residentRole?.id;

    // 3. Upsert user in public.users table
    const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ");
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
          email: input.email,
          role_id: roleId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authUserId);
    } else {
      await supabase.from("users").insert({
        id: authUserId,
        name: fullName,
        email: input.email,
        role_id: roleId,
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Safe insert or update in residents table (avoiding ON CONFLICT errors)
    const { data: existingResident } = await supabase
      .from("residents")
      .select("id")
      .or(`user_id.eq.${authUserId},email.eq.${input.email}`)
      .maybeSingle();

    let residentId: string;
    const residentPayload = {
      user_id: authUserId,
      email: input.email,
      first_name: input.firstName,
      middle_name: input.middleName || null,
      last_name: input.lastName,
      birth_date: input.birthDate,
      gender: input.gender,
      contact_number: input.contactNumber || null,
      civil_status: "Single",
      verification_status: "Pending",
      id_type: input.idType,
      id_photo_url: input.idPhotoUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400",
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

    // 5. Safe insert or update address
    const { data: existingAddress } = await supabase
      .from("addresses")
      .select("id")
      .eq("resident_id", residentId)
      .maybeSingle();

    const addressPayload = {
      resident_id: residentId,
      house_number: input.houseNumber || null,
      street: input.street || null,
      purok: input.purok || "Purok 1",
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
