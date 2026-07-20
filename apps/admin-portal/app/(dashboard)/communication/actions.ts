"use server";

import { createClient } from "@/lib/supabase/server";

export interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
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
  return { success: true };
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
