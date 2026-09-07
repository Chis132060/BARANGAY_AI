"use server";

import { createClient } from "@/lib/supabase/server";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  target_audience: "All" | "Residents" | "Senior" | "4Ps";
  status: "Draft" | "Published";
  created_at: string;
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return [];
  return data as Announcement[];
}

export async function publishAnnouncement(
  id: string | null,
  title: string,
  body: string,
  targetAudience: "All" | "Residents" | "Senior" | "4Ps",
  status: "Draft" | "Published"
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (id) {
    const { error } = await supabase
      .from("announcements")
      .update({ title, body, target_audience: targetAudience, status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    // INSERT triggers notifications for all targeted users via DB trigger (see migration)
    const { error } = await supabase
      .from("announcements")
      .insert([{ title, body, target_audience: targetAudience, status, created_by: user.id }]);
    if (error) throw new Error(error.message);
  }

  await supabase.from("transactions").insert({
    user_id: user.id,
    module: "Announcements",
    action: id ? "Update" : "Publish",
    description: `Announcement "${title}" ${id ? "updated" : "published"} for ${targetAudience}.`,
  });

  return { success: true };
}
