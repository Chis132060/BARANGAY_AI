const { createClient } = require("@supabase/supabase-js");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("Missing Supabase audit environment variables.");

const admin = createClient(url, serviceKey);

async function main() {
  const suffix = Date.now();
  const adminEmail = `live_audit_admin_${suffix}@example.com`;
  const residentEmail = `live_audit_resident_${suffix}@example.com`;
  const password = "LiveAudit!12345";
  const ids = { adminAuth: null, residentAuth: null, business: null, permit: null, announcement: null, policy: null, official: null, purok: null, precinct: null, notification: null };
  try {
    const adminUser = await admin.auth.admin.createUser({ email: adminEmail, password, email_confirm: true });
    if (adminUser.error) throw adminUser.error;
    ids.adminAuth = adminUser.data.user.id;
    const residentUser = await admin.auth.admin.createUser({ email: residentEmail, password, email_confirm: true });
    if (residentUser.error) throw residentUser.error;
    ids.residentAuth = residentUser.data.user.id;

    const roles = await admin.from("roles").select("id,name").in("name", ["Super Admin", "Resident"]);
    if (roles.error) throw roles.error;
    const roleMap = new Map(roles.data.map((role) => [role.name, role.id]));
    for (const row of [
      { id: ids.adminAuth, name: "Temporary Live Audit Admin", email: adminEmail, role_id: roleMap.get("Super Admin") },
      { id: ids.residentAuth, name: "Temporary Live Audit Resident", email: residentEmail, role_id: roleMap.get("Resident") },
    ]) {
      const inserted = await admin.from("users").insert(row);
      if (inserted.error) throw inserted.error;
    }

    const resident = await admin.from("residents").insert({
      user_id: ids.residentAuth, email: residentEmail, first_name: "Live", last_name: "Audit",
      birth_date: "1990-01-01", gender: "Male", civil_status: "Single", contact_number: "09170000000",
      verification_status: "Verified", id_type: "Driver's License", id_photo_url: "https://example.com/audit",
    }).select("id").single();
    if (resident.error) throw resident.error;
    const residentId = resident.data.id;

    const residentClient = createClient(url, anonKey);
    const residentLogin = await residentClient.auth.signInWithPassword({ email: residentEmail, password });
    if (residentLogin.error) throw residentLogin.error;
    const residentReads = {};
    for (const table of ["announcements", "document_types", "officials", "puroks", "precincts", "policies"]) {
      const result = await residentClient.from(table).select("*").limit(10);
      if (result.error) throw new Error("RESIDENT_READ_" + table + ":" + result.error.message);
      residentReads[table] = result.data.length;
    }

    const adminClient = createClient(url, anonKey);
    const adminLogin = await adminClient.auth.signInWithPassword({ email: adminEmail, password });
    if (adminLogin.error) throw adminLogin.error;

    const announcement = await adminClient.from("announcements").insert({ title: "Live audit announcement", description: "Temporary live audit record", category: "General", published_by: ids.adminAuth, status: "Published" }).select("id").single();
    if (announcement.error) throw new Error("ADMIN_ANNOUNCEMENT_WRITE:" + announcement.error.message);
    ids.announcement = announcement.data.id;

    const residentAnnouncement = await residentClient.from("announcements").select("id").eq("id", ids.announcement).single();
    if (residentAnnouncement.error) throw new Error("RESIDENT_ANNOUNCEMENT_READ:" + residentAnnouncement.error.message);

    const business = await residentClient.from("businesses").insert({ owner_id: residentId, business_name: "Live Audit Store", business_type: "Retail", address: "Temporary audit address", status: "Pending" }).select("id").single();
    if (business.error) throw new Error("RESIDENT_BUSINESS_WRITE:" + business.error.message);
    ids.business = business.data.id;

    const permit = await adminClient.from("business_permits").insert({ business_id: ids.business, permit_number: "LIVE-AUDIT-" + suffix, permit_type: "Barangay Business Clearance", issue_date: "2026-01-01", expiration_date: "2026-12-31", application_year: 2026, fee_amount: 0, status: "Active", issued_by: ids.adminAuth }).select("id").single();
    if (permit.error) throw new Error("ADMIN_PERMIT_WRITE:" + permit.error.message);
    ids.permit = permit.data.id;

    const policy = await adminClient.from("policies").insert({ policy_number: "LIVE-AUDIT-" + suffix, title: "Live Audit Policy", category: "Other", description: "Temporary live audit record", effective_date: "2026-01-01", status: "Active", enacted_by: "Live Audit", full_text: "Temporary live audit policy text.", created_by: ids.adminAuth }).select("id").single();
    if (policy.error) throw new Error("ADMIN_POLICY_WRITE:" + policy.error.message);
    ids.policy = policy.data.id;

    const purok = await adminClient.from("puroks").insert({ name: "Live Audit Purok " + suffix }).select("id").single();
    if (purok.error) throw new Error("ADMIN_PUROK_WRITE:" + purok.error.message);
    ids.purok = purok.data.id;
    const precinct = await adminClient.from("precincts").insert({ number: "LIVE-AUDIT-" + suffix, location: "Temporary audit location" }).select("id").single();
    if (precinct.error) throw new Error("ADMIN_PRECINCT_WRITE:" + precinct.error.message);
    ids.precinct = precinct.data.id;
    const official = await adminClient.from("officials").insert({ resident_id: residentId, position: "Audit Test Officer", start_term: "2026-01-01", status: "Active" }).select("id").single();
    if (official.error) throw new Error("ADMIN_OFFICIAL_WRITE:" + official.error.message);
    ids.official = official.data.id;

    const notification = await adminClient.from("notifications").insert({ user_id: ids.residentAuth, title: "Live audit notification", message: "Temporary live audit record", read_status: false }).select("id").single();
    if (notification.error) throw new Error("ADMIN_NOTIFICATION_WRITE:" + notification.error.message);
    ids.notification = notification.data.id;
    const residentNotification = await residentClient.from("notifications").select("id").eq("id", ids.notification).single();
    if (residentNotification.error) throw new Error("RESIDENT_NOTIFICATION_READ:" + residentNotification.error.message);

    console.log("LIVE_DATABASE_AUDIT_PASSED");
    console.log(JSON.stringify({ resident_reads: residentReads, admin_writes: ["announcement", "business", "permit", "policy", "purok", "precinct", "official", "notification"] }));
  } finally {
    if (ids.notification) await admin.from("notifications").delete().eq("id", ids.notification);
    if (ids.announcement) await admin.from("announcements").delete().eq("id", ids.announcement);
    if (ids.official) await admin.from("officials").delete().eq("id", ids.official);
    if (ids.precinct) await admin.from("precincts").delete().eq("id", ids.precinct);
    if (ids.purok) await admin.from("puroks").delete().eq("id", ids.purok);
    if (ids.policy) await admin.from("policies").delete().eq("id", ids.policy);
    if (ids.permit) await admin.from("business_permits").delete().eq("id", ids.permit);
    if (ids.business) await admin.from("businesses").delete().eq("id", ids.business);
    if (ids.residentAuth) await admin.from("residents").delete().eq("user_id", ids.residentAuth);
    if (ids.adminAuth) await admin.from("users").delete().eq("id", ids.adminAuth);
    if (ids.residentAuth) await admin.from("users").delete().eq("id", ids.residentAuth);
    if (ids.adminAuth) await admin.auth.admin.deleteUser(ids.adminAuth);
    if (ids.residentAuth) await admin.auth.admin.deleteUser(ids.residentAuth);
  }
}

main().catch((error) => {
  console.error("LIVE_DATABASE_AUDIT_FAILED:" + error.message);
  process.exitCode = 1;
});
