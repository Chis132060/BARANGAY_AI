"use server";

import { createClient } from "@/lib/supabase/server";

export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  created_at: string;
  operator?: {
    name: string;
    email: string;
  };
}

export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(`
      id,
      action,
      module,
      created_at,
      operator:users (
        name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching audit logs:", error.message);
    throw new Error(error.message);
  }

  return (data || []) as any[] as AuditLogItem[];
}

export async function writeAuditLog(action: string, module: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { error } = await supabase
      .from("audit_logs")
      .insert({
        user_id: user.id,
        action,
        module,
      });

    if (error) throw new Error(error.message);
  }

  return { success: true };
}
