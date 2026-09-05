const { createClient } = require("@supabase/supabase-js");

const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY are required.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Seeding real Supabase database with complete test records...");

  // 1. Roles
  const rolesList = [
    { name: "Super Admin" },
    { name: "Barangay Captain" },
    { name: "Secretary" },
    { name: "Treasurer" },
    { name: "Staff" },
    { name: "Resident" },
  ];

  for (const r of rolesList) {
    await supabase.from("roles").upsert(r, { onConflict: "name" });
  }

  const { data: roles } = await supabase.from("roles").select("id, name");
  const roleMap = {};
  roles.forEach((r) => { roleMap[r.name] = r.id; });
  console.log("Roles ensured:", roleMap);

  // 2. Full permissions for Super Admin
  if (roleMap["Super Admin"]) {
    await supabase.from("permissions").upsert(
      {
        role_id: roleMap["Super Admin"],
        module: "*",
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_approve: true,
      },
      { onConflict: "role_id,module" }
    );
  }

  // 3. Document Types
  const docTypes = [
    { name: "Barangay Clearance", description: "Official clearance for employment, ID, or travel.", requirements: "Valid ID, Cedula" },
    { name: "Certificate of Residency", description: "Proof of residency for official transactions.", requirements: "Valid ID, Proof of Address" },
    { name: "Certificate of Indigency", description: "Assistance certificate for medical/financial aid.", requirements: "Case study report, Barangay endorsement" },
    { name: "Business Clearance", description: "Barangay permit for commercial operation.", requirements: "DTI/SEC registration, Lease contract" },
  ];

  for (const dt of docTypes) {
    await supabase.from("document_types").upsert(dt, { onConflict: "name" });
  }
  const { data: dbDocTypes } = await supabase.from("document_types").select("id, name");
  const docTypeMap = {};
  dbDocTypes.forEach((dt) => { docTypeMap[dt.name] = dt.id; });
  console.log("Document types ensured:", docTypeMap);

  // 4. Test Announcements
  const announcements = [
    {
      title: "Barangay General Assembly 2026",
      description: "Annual general assembly meeting covering community safety, budget reports, and new resident programs. All residents are encouraged to attend.",
      category: "Community Meeting",
      status: "Published",
      published_date: new Date().toISOString(),
    },
    {
      title: "Free Anti-Rabies Vaccination Caravan",
      description: "The Barangay Health Committee will conduct free anti-rabies vaccination for pet dogs and cats at the Barangay Covered Court from 8:00 AM to 3:00 PM.",
      category: "Health & Wellness",
      status: "Published",
      published_date: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      title: "Community Clean-Up Drive",
      description: "Join us this Saturday for our Purok clean-up drive and dengue prevention campaign. Volunteers please assemble at the Barangay Hall at 6:30 AM.",
      category: "Environment",
      status: "Published",
      published_date: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  for (const a of announcements) {
    const { data: existing } = await supabase.from("announcements").select("id").eq("title", a.title).maybeSingle();
    if (!existing) {
      await supabase.from("announcements").insert(a);
    }
  }
  console.log("Announcements seeded.");

  // 5. Test Residents (Verified & Pending)
  const testResidents = [
    {
      first_name: "Juan",
      middle_name: "Santos",
      last_name: "Dela Cruz",
      birth_date: "1990-05-15",
      gender: "Male",
      civil_status: "Married",
      contact_number: "09171234567",
      voter_status: true,
      senior_status: false,
      pwd_status: false,
      four_ps_status: false,
      verification_status: "Verified",
      id_type: "Driver's License",
      id_photo_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400",
      address: { house_number: "123", street: "Rizal St", purok: "Purok 1" },
    },
    {
      first_name: "Maria",
      middle_name: "Cruz",
      last_name: "Santos",
      birth_date: "1945-08-20",
      gender: "Female",
      civil_status: "Widowed",
      contact_number: "09187654321",
      voter_status: true,
      senior_status: true,
      pwd_status: false,
      four_ps_status: false,
      verification_status: "Verified",
      id_type: "Philippine Identification",
      id_photo_url: "https://images.unsplash.com/photo-1589386417686-0d34b5903d23?w=400",
      address: { house_number: "456", street: "Magsaysay Ave", purok: "Purok 2" },
    },
    {
      first_name: "Emilio",
      middle_name: "",
      last_name: "Aguinaldo",
      birth_date: "1988-03-22",
      gender: "Male",
      civil_status: "Single",
      contact_number: "09179998888",
      voter_status: false,
      senior_status: false,
      pwd_status: false,
      four_ps_status: false,
      verification_status: "Pending",
      id_type: "Philippine Identification (PhilID / ePhilID)",
      id_photo_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
      address: { house_number: "124", street: "Rizal St", purok: "Purok 1" },
    },
    {
      first_name: "Gabriela",
      middle_name: "",
      last_name: "Silang",
      birth_date: "1992-07-14",
      gender: "Female",
      civil_status: "Married",
      contact_number: "09224441111",
      voter_status: false,
      senior_status: false,
      pwd_status: false,
      four_ps_status: false,
      verification_status: "Pending",
      id_type: "Voter's ID / Voter's Certification",
      id_photo_url: "https://images.unsplash.com/photo-1589386417686-0d34b5903d23?w=600",
      address: { house_number: "45", street: "Magsaysay Ave", purok: "Purok 3" },
    },
  ];

  let juanResidentId = null;
  for (const r of testResidents) {
    const { address, ...resFields } = r;
    const { data: existing } = await supabase
      .from("residents")
      .select("id")
      .eq("first_name", resFields.first_name)
      .eq("last_name", resFields.last_name)
      .maybeSingle();

    let resId = existing?.id;
    if (!resId) {
      const { data: created, error } = await supabase.from("residents").insert(resFields).select("id").single();
      if (!error && created) {
        resId = created.id;
      }
    } else {
      await supabase.from("residents").update(resFields).eq("id", resId);
    }

    if (resId && address) {
      await supabase.from("addresses").upsert(
        { resident_id: resId, ...address },
        { onConflict: "resident_id" }
      );
    }

    if (resFields.first_name === "Juan") {
      juanResidentId = resId;
    }
  }
  console.log("Residents seeded.");

  // 6. Test Document Requests
  if (juanResidentId && docTypeMap["Barangay Clearance"]) {
    const { data: existingReq } = await supabase
      .from("document_requests")
      .select("id")
      .eq("resident_id", juanResidentId)
      .maybeSingle();

    if (!existingReq) {
      await supabase.from("document_requests").insert([
        {
          resident_id: juanResidentId,
          document_type_id: docTypeMap["Barangay Clearance"],
          status: "Pending",
          fee_amount: 50.00,
          payment_status: "Unpaid",
          remarks: "For Employment Application",
          requested_date: new Date().toISOString(),
        },
        {
          resident_id: juanResidentId,
          document_type_id: docTypeMap["Certificate of Residency"] || docTypeMap["Barangay Clearance"],
          status: "Approved",
          fee_amount: 50.00,
          payment_status: "Paid",
          remarks: "Bank Account Opening",
          requested_date: new Date(Date.now() - 86400000).toISOString(),
        }
      ]);
      console.log("Document requests seeded.");
    }
  }

  // 7. Test Complaints
  if (juanResidentId) {
    const { data: existingComp } = await supabase
      .from("complaints")
      .select("id")
      .eq("complainant_id", juanResidentId)
      .maybeSingle();

    if (!existingComp) {
      await supabase.from("complaints").insert({
        complainant_id: juanResidentId,
        category: "Noise Complaint",
        description: "Loud videoke and disturbance past 11:00 PM along Rizal St.",
        status: "Filed",
      });
      console.log("Complaints seeded.");
    }
  }

  console.log("Database successfully seeded with all real test data!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
