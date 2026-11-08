"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkUserPermission } from "../administration/rbac-actions";

export interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
  category: string;
  status: "Draft" | "Published" | "Archived";
  published_date?: string;
  author?: {
    name: string;
  };
}

export interface AppointmentItem {
  id: string;
  resident_id: string;
  type: string;
  schedule_date: string;
  status: "Pending" | "Approved" | "Cancelled" | "Completed";
  resident: {
    first_name: string;
    last_name: string;
  };
}

export interface TransactionLogItem {
  id: string;
  module: string;
  action: string;
  description?: string;
  created_at: string;
  operator?: {
    name: string;
  };
}

export async function fetchAnnouncements(): Promise<AnnouncementItem[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("announcements")
    .select(`
      id,
      title,
      description,
      category,
      status,
      published_date,
      image_url,
      author:users (
        name
      )
    `);

  if (error) {
    console.error("Error fetching announcements:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as AnnouncementItem[];
}

export async function createAnnouncement(formData: {
  title: string;
  description: string;
  category: string;
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "communication", "canCreate"))) throw new Error("Insufficient permissions to create an announcement");

  const { error } = await supabase
    .from("announcements")
    .insert({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      published_by: user?.id || null,
      status: "Published",
      published_date: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "CREATE_ANNOUNCEMENT", module: "communication", details: { title: formData.title, category: formData.category } });
  return { success: true };
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read_status: boolean;
  created_at: string;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "communication", "canView"))) throw new Error("Insufficient permissions: view on communication required");
  const { data, error } = await supabase.from("notifications").select("id, user_id, title, message, read_status, created_at").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  return (data || []) as NotificationItem[];
}

export async function fetchAppointments(): Promise<AppointmentItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(`
      id,
      resident_id,
      type,
      schedule_date,
      status,
      resident:residents (
        first_name,
        last_name
      )
    `);

  if (error) {
    console.error("Error fetching appointments:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as AppointmentItem[];
}

export async function fetchTransactionLogs(): Promise<TransactionLogItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select(`
      id,
      module,
      action,
      description,
      created_at,
      operator:users (
        name
      )
    `);

  if (error) {
    console.error("Error fetching transaction logs:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as TransactionLogItem[];
}


// ─── Staff-created appointments (walk-in / assisted booking) ─────────────────

export interface ResidentOption {
  id: string;
  first_name: string;
  last_name: string;
}

/** Verified residents that staff can book on behalf of. */
export async function fetchBookableResidents(): Promise<ResidentOption[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "communication", "canView"))) throw new Error("Insufficient permissions");
  const { data, error } = await supabase
    .from("residents")
    .select("id, first_name, last_name")
    .eq("verification_status", "Verified")
    .order("last_name");
  if (error) throw new Error(error.message);
  return (data || []) as ResidentOption[];
}

export async function createAppointmentForResident(input: {
  resident_id: string;
  type: string;
  schedule_date: string; // ISO string
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "communication", "canCreate"))) throw new Error("Insufficient permissions to schedule appointments");

  const type = input.type.trim();
  if (!input.resident_id) throw new Error("Select a resident.");
  if (!type || type.length > 50) throw new Error("Appointment purpose is required (max 50 characters).");
  const when = new Date(input.schedule_date);
  if (Number.isNaN(when.getTime())) throw new Error("Enter a valid date and time.");
  if (when.getFullYear() < 2000 || when.getFullYear() > 2100) throw new Error("Please enter a valid year (2000–2100).");
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  if (when < startOfToday) throw new Error("Appointment date cannot be in the past.");

  // Staff have no INSERT policy on appointments (only residents book their own),
  // so write with the service client — after the permission check above.
  const admin = createAdminClient();
  const { data: resident, error: residentError } = await admin
    .from("residents")
    .select("id, user_id, verification_status")
    .eq("id", input.resident_id)
    .maybeSingle();
  if (residentError) throw new Error(residentError.message);
  if (!resident || resident.verification_status !== "Verified") throw new Error("Only verified residents can be scheduled.");

  const { data: duplicate } = await admin
    .from("appointments")
    .select("id")
    .eq("resident_id", input.resident_id)
    .eq("type", type)
    .eq("schedule_date", when.toISOString())
    .in("status", ["Pending", "Approved"])
    .limit(1);
  if (duplicate?.length) throw new Error("This resident already has the same appointment at that time.");

  const { data: created, error } = await admin
    .from("appointments")
    .insert({ resident_id: input.resident_id, type, schedule_date: when.toISOString(), status: "Approved" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Best-effort: let the resident know if they have a portal account.
  if (resident.user_id) {
    await admin.from("notifications").insert({
      user_id: resident.user_id,
      title: "Appointment scheduled",
      message: `The Barangay Hall scheduled your ${type} appointment on ${when.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}.`,
    });
  }

  await supabase.from("audit_logs").insert({ user_id: user.id, action: "CREATE_APPOINTMENT", module: "communication", details: { id: created.id, resident_id: input.resident_id, type, schedule_date: when.toISOString(), created_by_staff: true } });
  return { success: true };
}

export async function updateAppointmentStatus(id: string, status: "Pending" | "Approved" | "Cancelled" | "Completed") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await checkUserPermission(user.id, "communication", "canEdit"))) throw new Error("Insufficient permissions to update appointments");
  if (!["Pending", "Approved", "Cancelled", "Completed"].includes(status)) throw new Error("Invalid status.");
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.from("audit_logs").insert({ user_id: user.id, action: "UPDATE_APPOINTMENT_STATUS", module: "communication", details: { id, status } });
  return { success: true };
}
