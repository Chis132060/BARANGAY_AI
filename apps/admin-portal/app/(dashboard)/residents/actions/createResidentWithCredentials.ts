"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkUserPermission } from "../../administration/rbac-actions";
import nodemailer from "nodemailer";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateResidentCode(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequenceNumber).padStart(5, "0");
  return `BRY-${year}-${padded}`;
}

function generatePassword(length = 10): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

async function getNextResidentSequence(supabaseAdmin: ReturnType<typeof createAdminClient>): Promise<number> {
  const { count } = await supabaseAdmin
    .from("residents")
    .select("*", { count: "exact", head: true });
  return (count ?? 0) + 1;
}

async function sendCredentialsEmail(
  toEmail: string,
  firstName: string,
  username: string,
  password: string
) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const pwaDomain = process.env.NEXT_PUBLIC_PWA_URL ?? "http://localhost:3001";

  await transporter.sendMail({
    from: `"Smart Barangay" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Your Smart Barangay Account Credentials",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #1e40af; margin-bottom: 8px;">Welcome to Smart Barangay!</h2>
        <p style="color: #374151; margin-bottom: 24px;">Hi <strong>${firstName}</strong>, your resident account has been created by the Barangay Office. Use the credentials below to log in.</p>

        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Username</p>
          <p style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #111827; letter-spacing: 0.05em;">${username}</p>
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Password</p>
          <p style="margin: 0; font-size: 18px; font-weight: 700; color: #111827; letter-spacing: 0.1em;">${password}</p>
        </div>

        <a href="${pwaDomain}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Login to Smart Barangay</a>

        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Please change your password after your first login. If you did not request this, contact your Barangay Office.</p>
      </div>
    `,
  });
}

// ─── Main Action ──────────────────────────────────────────────────────────────

export interface CreateResidentWithCredentialsInput {
  first_name: string;
  middle_name?: string;
  last_name: string;
  birth_date: string;
  gender: "Male" | "Female" | "Other";
  civil_status: "Single" | "Married" | "Widowed" | "Divorced";
  contact_number?: string;
  email?: string;
  voter_status: boolean;
  senior_status: boolean;
  pwd_status: boolean;
  four_ps_status: boolean;
  house_number?: string;
  street?: string;
  purok?: string;
}

export interface CreateResidentResult {
  success: boolean;
  residentCode: string;
  emailSent: boolean;
  /** Only returned when no email — for admin to display/print the credential slip */
  generatedPassword?: string;
  error?: string;
}

export async function createResidentWithCredentials(
  input: CreateResidentWithCredentialsInput
): Promise<CreateResidentResult> {
  const supabase = createClient();
  const supabaseAdmin = createAdminClient();

  // RBAC check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const allowed = await checkUserPermission(user.id, "residents", "canCreate");
  if (!allowed) throw new Error("Insufficient permissions");

  // Generate resident code + password
  const sequence = await getNextResidentSequence(supabaseAdmin);
  const residentCode = generateResidentCode(sequence);
  const password = generatePassword();

  // Determine auth email (real email or synthetic BRY- email)
  const hasEmail = !!input.email?.trim();
  const authEmail = hasEmail
    ? input.email!.trim()
    : `${residentCode.toLowerCase()}@smartbarangay.local`;

  // 1. Create Supabase Auth user
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true, // skip email confirmation — admin-created account
    });

  if (authError) {
    return { success: false, residentCode, emailSent: false, error: authError.message };
  }

  const authUserId = authData.user.id;

  // 2. Insert resident record
  const { data: resData, error: resError } = await supabaseAdmin
    .from("residents")
    .insert({
      user_id: authUserId,
      email: hasEmail ? input.email!.trim() : null,
      resident_code: residentCode,
      first_name: input.first_name,
      middle_name: input.middle_name,
      last_name: input.last_name,
      birth_date: input.birth_date,
      gender: input.gender,
      civil_status: input.civil_status,
      contact_number: input.contact_number,
      voter_status: input.voter_status,
      senior_status: input.senior_status,
      pwd_status: input.pwd_status,
      four_ps_status: input.four_ps_status,
      verification_status: "Verified", // admin-registered = pre-verified
    })
    .select("id")
    .single();

  if (resError) {
    // Rollback auth user if resident insert fails
    await supabaseAdmin.auth.admin.deleteUser(authUserId);
    return { success: false, residentCode, emailSent: false, error: resError.message };
  }

  // 3. Insert address if at least one address field was provided.
  // Do not silently report success if the address insert fails; that creates
  // a resident record with apparently missing profile fields.
  if ((input.house_number?.trim() || input.street?.trim() || input.purok?.trim()) && resData) {
    const { error: addressError } = await supabaseAdmin.from("addresses").insert({
      resident_id: resData.id,
      house_number: input.house_number?.trim() || null,
      street: input.street?.trim() || null,
      purok: input.purok?.trim() || null,
    });

    if (addressError) {
      // Keep auth/profile data consistent when this multi-step operation fails.
      await supabaseAdmin.from("residents").delete().eq("id", resData.id);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return {
        success: false,
        residentCode,
        emailSent: false,
        error: `Resident address could not be saved: ${addressError.message}`,
      };
    }
  }

  // 4. Audit log
  await supabaseAdmin.from("audit_logs").insert({
    user_id: user.id,
    action: "CREATE_RESIDENT",
    module: "residents",
    details: {
      resident_id: resData.id,
      resident_code: residentCode,
      resident_name: `${input.first_name} ${input.last_name}`.trim(),
      has_email: hasEmail,
      created_at: new Date().toISOString(),
    },
  });

  // 5. Send credentials email (only if real email provided)
  let emailSent = false;
  if (hasEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      await sendCredentialsEmail(
        input.email!.trim(),
        input.first_name,
        input.email!.trim(),
        password
      );
      emailSent = true;
    } catch (emailErr) {
      console.error("[EMAIL] Failed to send credentials email:", emailErr);
    }
  }

  return {
    success: true,
    residentCode,
    emailSent,
    // Only expose the plain-text password when no real email was provided
    // so the admin can print and hand it to the resident in person.
    generatedPassword: hasEmail ? undefined : password,
  };
}
