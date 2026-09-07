"use server";

import { createClient } from "@/lib/supabase/server";
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
