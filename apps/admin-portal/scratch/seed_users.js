const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pedevaqxrudflvostpja.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || "";

if (!supabaseServiceKey) {
  console.error("Please set SUPABASE_SECRET_KEY environment variable.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function seedUsers() {
  console.log("Seeding test users...");

  // 1. Create Admin User
  const adminEmail = "admin@barangay.gov";
  const adminPassword = "password123";
  
  const { data: adminAuth, error: adminError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { role: "Super Admin" }
  });

  if (adminError) {
    if (adminError.message.includes("already registered")) {
      console.log(`Admin user (${adminEmail}) already exists.`);
    } else {
      console.error("Error creating admin user:", adminError);
    }
  } else {
    console.log(`Successfully created Admin User: ${adminEmail} / ${adminPassword}`);
  }

  // 2. Create Resident User
  const residentEmail = "resident@barangay.gov";
  const residentPassword = "password123";

  const { data: resAuth, error: resError } = await supabase.auth.admin.createUser({
    email: residentEmail,
    password: residentPassword,
    email_confirm: true,
    user_metadata: { role: "resident" }
  });

  if (resError) {
    if (resError.message.includes("already registered")) {
      console.log(`Resident user (${residentEmail}) already exists.`);
    } else {
      console.error("Error creating resident user:", resError);
    }
  } else {
    console.log(`Successfully created Resident User: ${residentEmail} / ${residentPassword}`);
  }
}

seedUsers();
