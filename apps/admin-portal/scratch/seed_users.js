const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pedevaqxrudflvostpja.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

  // 1. Create or repair Super Admin role and permissions.
  const { data: existingRole, error: roleLookupError } = await supabase
    .from("roles")
    .select("id, name")
    .eq("name", "Super Admin")
    .maybeSingle();

  if (roleLookupError) {
    throw roleLookupError;
  }

  let superAdminRole = existingRole;
  if (!superAdminRole) {
    const { data: createdRole, error: roleCreateError } = await supabase
      .from("roles")
      .insert({ name: "Super Admin" })
      .select("id, name")
      .single();

    if (roleCreateError) throw roleCreateError;
    superAdminRole = createdRole;
  }

  const { error: permissionError } = await supabase
    .from("permissions")
    .upsert(
      {
        role_id: superAdminRole.id,
        module: "*",
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_approve: true,
      },
      { onConflict: "role_id,module" }
    );

  if (permissionError) throw permissionError;

  // 2. Create or update Admin Auth User
  const adminEmail = "admin@barangay.gov";
  const adminPassword = "password123";

  let adminUser = null;
  let page = 1;

  while (!adminUser) {
    const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (listError) throw listError;

    adminUser = usersPage.users.find((user) => user.email?.toLowerCase() === adminEmail);
    if (adminUser || usersPage.users.length < 100) break;
    page += 1;
  }

  if (adminUser) {
    const { data: updatedAuth, error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      {
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { role: "Super Admin", name: "Admin Officer" },
      }
    );

    if (updateError) throw updateError;
    adminUser = updatedAuth.user;
    console.log("Updated Admin Auth user password and metadata.");
  } else {
    const { data: adminAuth, error: adminError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { role: "Super Admin", name: "Admin Officer" },
    });

    if (adminError) {
      throw adminError;
    }

    adminUser = adminAuth.user;
    console.log("Created Admin Auth user.");
  }

  const { error: profileError } = await supabase
    .from("users")
    .upsert(
      {
        id: adminUser.id,
        name: "Admin Officer",
        email: adminEmail,
        role_id: superAdminRole.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (profileError) throw profileError;

  console.log("Admin login ready: admin@barangay.gov / password123");

  // 3. Create Resident User
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
