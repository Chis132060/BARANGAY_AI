const { createClient } = require("@supabase/supabase-js");

const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY are required.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSync() {
  console.log("--- TESTING PWA TO ADMIN SYNCHRONIZATION ---");

  // Step 1: Simulate PWA registration of a new resident
  const testEmail = `testresident_${Date.now()}@example.com`;
  console.log(`1. Simulating PWA registration for: ${testEmail}`);

  // Create auth user
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: "password123",
    email_confirm: true,
    user_metadata: { role: "Resident", full_name: "Test Sync Resident" },
  });
  if (authErr) throw authErr;
  console.log("Auth user created:", authUser.user.id);

  // Insert resident row with Pending status
  const { data: resRow, error: resErr } = await supabase.from("residents").insert({
    user_id: authUser.user.id,
    email: testEmail,
    first_name: "Test",
    last_name: "SyncResident",
    birth_date: "1995-01-01",
    gender: "Male",
    civil_status: "Single",
    contact_number: "09123456789",
    verification_status: "Pending",
    id_type: "Driver's License",
    id_photo_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400",
  }).select("id").single();
  if (resErr) throw resErr;
  console.log("Resident row created with ID:", resRow.id);

  // Step 2: Query Admin Verification Queue
  console.log("2. Querying Admin Verification Queue for Pending residents...");
  const { data: pendingList, error: pendingErr } = await supabase
    .from("residents")
    .select("id, first_name, last_name, email, verification_status, created_at")
    .eq("verification_status", "Pending")
    .order("created_at", { ascending: false });

  if (pendingErr) throw pendingErr;
  console.log(`Found ${pendingList.length} pending residents in Admin Queue:`);
  pendingList.forEach((r) => {
    console.log(` - ${r.first_name} ${r.last_name} (${r.email}) -> Status: ${r.verification_status}`);
  });

  const found = pendingList.some((r) => r.id === resRow.id);
  if (!found) {
    throw new Error("FAILED: Registered resident was not found in Admin Verification Queue!");
  }
  console.log("SUCCESS: PWA registration arrived in Admin Verification Queue!");

  // Step 3: Admin Approves the Resident
  console.log("3. Simulating Admin clicking 'Approve & Verify Resident'...");
  const { error: approveErr } = await supabase
    .from("residents")
    .update({ verification_status: "Verified", updated_at: new Date().toISOString() })
    .eq("id", resRow.id);

  if (approveErr) throw approveErr;

  // Verify that resident is now Verified
  const { data: updatedResident } = await supabase
    .from("residents")
    .select("id, verification_status")
    .eq("id", resRow.id)
    .single();

  console.log(`Resident verification_status is now: ${updatedResident.verification_status}`);
  if (updatedResident.verification_status !== "Verified") {
    throw new Error("FAILED: Approval did not update verification_status to Verified!");
  }
  console.log("SUCCESS: Resident is verified and can now log in!");

  // Clean up test user
  await supabase.from("residents").delete().eq("id", resRow.id);
  await supabase.auth.admin.deleteUser(authUser.user.id);
  console.log("Cleaned up test registration.");
  console.log("--- ALL SYNC TESTS PASSED SUCCESSFULLY! ---");
}

testSync().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
