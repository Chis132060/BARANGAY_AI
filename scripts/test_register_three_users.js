const { createClient } = require("@supabase/supabase-js");

const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceKey);

const testApplicants = [
  {
    firstName: "Juanito",
    middleName: "Santos",
    lastName: "Ramos",
    birthDate: "1994-06-12",
    gender: "Male",
    contactNumber: "09171112233",
    houseNumber: "77",
    street: "Mabini St",
    purok: "Purok 2",
    email: "juanito.ramos@gmail.com",
    password: "password123",
    idType: "Philippine Identification (PhilID / ePhilID)",
    idPhotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
  },
  {
    firstName: "Carmela",
    middleName: "Dela",
    lastName: "Gomez",
    birthDate: "1998-09-24",
    gender: "Female",
    contactNumber: "09223335566",
    houseNumber: "18",
    street: "Luna St",
    purok: "Purok 4",
    email: "carmela.gomez@gmail.com",
    password: "password123",
    idType: "Driver's License",
    idPhotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600",
  },
  {
    firstName: "Danilo",
    middleName: "Cruz",
    lastName: "Bautista",
    birthDate: "1985-03-17",
    gender: "Male",
    contactNumber: "09398887766",
    houseNumber: "205",
    street: "Bonifacio St",
    purok: "Purok 5",
    email: "danilo.bautista@gmail.com",
    password: "password123",
    idType: "UMID / SSS / GSIS Card",
    idPhotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600",
  },
];

async function run() {
  console.log("=== REGISTERING 3 EXAMPLE USERS VIA PWA REGISTRATION LOGIC ===");

  const { data: residentRole } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "Resident")
    .maybeSingle();

  for (const applicant of testApplicants) {
    console.log(`\nRegistering: ${applicant.firstName} ${applicant.lastName} (${applicant.email})...`);

    // 1. Auth account
    let authUserId;
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: applicant.email,
      password: applicant.password,
      email_confirm: true,
      user_metadata: {
        role: "Resident",
        full_name: `${applicant.firstName} ${applicant.lastName}`.trim(),
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        const { data: usersPage } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
        const existing = usersPage?.users.find((u) => u.email?.toLowerCase() === applicant.email.toLowerCase());
        authUserId = existing.id;
        console.log(" - User already in Auth, using ID:", authUserId);
      } else {
        throw authError;
      }
    } else {
      authUserId = authData.user.id;
      console.log(" - Created Auth User ID:", authUserId);
    }

    // 2. Users table row
    const fullName = [applicant.firstName, applicant.middleName, applicant.lastName].filter(Boolean).join(" ");
    const { data: existingUser } = await supabase.from("users").select("id").eq("id", authUserId).maybeSingle();
    if (existingUser) {
      await supabase.from("users").update({ name: fullName, email: applicant.email, role_id: residentRole.id }).eq("id", authUserId);
    } else {
      await supabase.from("users").insert({ id: authUserId, name: fullName, email: applicant.email, role_id: residentRole.id });
    }

    // 3. Resident profile
    const { data: existingRes } = await supabase
      .from("residents")
      .select("id")
      .or(`user_id.eq.${authUserId},email.eq.${applicant.email}`)
      .maybeSingle();

    let resId;
    const resPayload = {
      user_id: authUserId,
      email: applicant.email,
      first_name: applicant.firstName,
      middle_name: applicant.middleName,
      last_name: applicant.lastName,
      birth_date: applicant.birthDate,
      gender: applicant.gender,
      contact_number: applicant.contactNumber,
      civil_status: "Single",
      verification_status: "Pending",
      id_type: applicant.idType,
      id_photo_url: applicant.idPhotoUrl,
      updated_at: new Date().toISOString(),
    };

    if (existingRes) {
      await supabase.from("residents").update(resPayload).eq("id", existingRes.id);
      resId = existingRes.id;
      console.log(" - Updated resident profile with Pending status, ID:", resId);
    } else {
      const { data: created, error } = await supabase.from("residents").insert(resPayload).select("id").single();
      if (error) throw error;
      resId = created.id;
      console.log(" - Created resident profile with Pending status, ID:", resId);
    }

    // 4. Address
    const { data: existingAddr } = await supabase.from("addresses").select("id").eq("resident_id", resId).maybeSingle();
    const addrPayload = {
      resident_id: resId,
      house_number: applicant.houseNumber,
      street: applicant.street,
      purok: applicant.purok,
    };
    if (existingAddr) {
      await supabase.from("addresses").update(addrPayload).eq("id", existingAddr.id);
    } else {
      await supabase.from("addresses").insert(addrPayload);
    }
  }

  // Verification step: Check the Admin Verification Queue
  console.log("\n=== VERIFYING ADMIN VERIFICATION QUEUE ===");
  const { data: pendingList, error: pendingErr } = await supabase
    .from("residents")
    .select(`
      id,
      first_name,
      last_name,
      email,
      verification_status,
      id_type,
      created_at,
      address:addresses (
        house_number,
        street,
        purok
      )
    `)
    .eq("verification_status", "Pending")
    .order("created_at", { ascending: false });

  if (pendingErr) throw pendingErr;

  console.log(`Total Pending Residents in Admin Queue: ${pendingList.length}`);
  pendingList.forEach((r, idx) => {
    const addr = Array.isArray(r.address) ? r.address[0] : r.address;
    console.log(`${idx + 1}. ${r.first_name} ${r.last_name} | Email: ${r.email || "N/A"} | ID Type: ${r.id_type} | Address: ${addr ? `${addr.house_number} ${addr.street}, ${addr.purok}` : "N/A"}`);
  });

  console.log("\n=== TEST COMPLETE: ALL APPLICANTS ARE IN THE VERIFICATION QUEUE! ===");
}

run().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
