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

// The live announcements table stores content in description and category.
// Category is not an audience field, so legacy categories default to "All".
export async function fetchAnnouncements(): Promise<Announcement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id,title,description,category,status,created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Unable to fetch announcements: ${error.message}`);
  return (data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    body: item.description ?? "",
    target_audience: (["All", "Residents", "Senior", "4Ps"].includes(item.category)
      ? item.category
      : "All") as Announcement["target_audience"],
    status: item.status as Announcement["status"],
    created_at: item.created_at,
  }));
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

  // The database currently has no target_audience column. Preserve existing
  // category values on edits rather than overwriting them with audience labels.
  const fields = { title, description: body, status };
  if (id) {
    const { error } = await supabase.from("announcements").update(fields).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("announcements").insert([{
      ...fields,
      category: "General",
      published_by: user.id,
      published_date: status === "Published" ? new Date().toISOString() : null,
    }]);
    if (error) throw new Error(error.message);
  }

  // Audience targeting and push notifications require a separate persisted
  // audience field and notification workflow; do not claim delivery here.
  return { success: true };
}
