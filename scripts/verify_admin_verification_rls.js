const { createClient } = require("@supabase/supabase-js");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  throw new Error("Missing Supabase test environment variables.");
}

const admin = createClient(url, serviceKey);

async function main() {
  const suffix = Date.now();
  const adminEmail = `rls_admin_${suffix}@example.com`;
  const residentEmail = `rls_resident_${suffix}@example.com`;
  const password = "RlsVerify!12345";
  let adminAuthId;
  let residentAuthId;
  let residentId;
  let notificationId;
  let residentRoleId;

  try {
    const adminUser = await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true });
    if (adminUser.error) throw adminUser.error;
    adminAuthId = adminUser.data.user.id;

    const role = await admin.from("roles").select("id").eq("name", "Super Admin").single();
    if (role.error) throw role.error;
    const residentRole = await admin.from("roles").select("id").eq("name", "Resident").single();
    if (residentRole.error) throw residentRole.error;
    residentRoleId = residentRole.data.id;

    const adminRow = await admin.from("users").insert({
      id: adminAuthId,
      name: "Temporary RLS Admin",
      email: adminEmail,
      role_id: role.data.id,
    });
    if (adminRow.error) throw adminRow.error;

    const residentUser = await admin.auth.admin.createUser({ email: residentEmail, password, email_confirm: true });
    if (residentUser.error) throw residentUser.error;
    residentAuthId = residentUser.data.user.id;

    const residentProfile = await admin.from("users").insert({
      id: residentAuthId,
      name: "Temporary Resident",
      email: residentEmail,
      role_id: residentRoleId,
    });
    if (residentProfile.error) throw residentProfile.error;

    const resident = await admin.from("residents").insert({
      user_id: residentAuthId,
      email: residentEmail,
      first_name: "Temporary",
      last_name: "Resident",
      birth_date: "1990-01-01",
      gender: "Male",
      civil_status: "Single",
      contact_number: "09170000000",
      verification_status: "Pending",
      id_type: "Driver's License",
      id_photo_url: "https://example.com/rls-test",
    }).select("id").single();
    if (resident.error) throw resident.error;
    residentId = resident.data.id;

    const client = createClient(url, anonKey);
    const login = await client.auth.signInWithPassword({ email: adminEmail, password });
    if (login.error) throw login.error;

    const updated = await client.from("residents")
      .update({ verification_status: "Verified", updated_at: new Date().toISOString() })
      .eq("id", residentId)
      .select("id, verification_status")
      .maybeSingle();
    if (updated.error) throw new Error(`ADMIN_UPDATE_FAILED:${updated.error.message}`);
    if (!updated.data || updated.data.verification_status !== "Verified") {
      throw new Error("ADMIN_UPDATE_FAILED:no row updated");
    }

    const notification = await client.from("notifications").insert({
      user_id: residentAuthId,
      title: "RLS test",
      message: "RLS test notification",
      read_status: false,
    }).select("id").single();
    if (notification.error) throw new Error(`ADMIN_NOTIFICATION_FAILED:${notification.error.message}`);
    notificationId = notification.data.id;

    console.log("ADMIN_VERIFICATION_RLS_TEST_PASSED");
  } finally {
    if (notificationId) await admin.from("notifications").delete().eq("id", notificationId);
    if (residentId) await admin.from("residents").delete().eq("id", residentId);
    if (residentAuthId) await admin.from("users").delete().eq("id", residentAuthId);
    if (adminAuthId) await admin.from("users").delete().eq("id", adminAuthId);
    if (residentAuthId) await admin.auth.admin.deleteUser(residentAuthId);
    if (adminAuthId) await admin.auth.admin.deleteUser(adminAuthId);
  }
}

main().catch((error) => {
  console.error(`ADMIN_VERIFICATION_RLS_TEST_FAILED:${error.message}`);
  process.exitCode = 1;
});
