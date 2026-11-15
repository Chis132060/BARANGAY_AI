import { fetchAnnouncements } from "../actions";
import { AnnouncementList } from "./components/AnnouncementList";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Community Announcements",
  description: "Barangay announcements and updates creator.",
};

export default async function AnnouncementsPage() {
  const announcements = await fetchAnnouncements();
  const supabase = createClient();
  const { data: sourceRows, error: archiveError } = await supabase
    .from("tandang_sora_source_archive")
    .select("id,title,summary,publisher,source_url,source_date,event_date,scope")
    .eq("section", "news")
    .eq("is_public", true)
    .order("source_date", { ascending: false, nullsFirst: false });
  const archivedNews = (sourceRows ?? []) as Array<{
    id: string; title: string; summary: string; publisher: string; source_url: string;
    source_date: string | null; event_date: string | null; scope: string;
  }>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barangay Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Publish news updates, emergency warnings, and community bulletins.</p>
        </div>
      </div>

      <AnnouncementList announcements={announcements} />
      <section className="space-y-3 rounded-2xl border bg-white p-5" aria-label="Government-sourced historical news archive">
        <div>
          <h2 className="text-lg font-bold text-foreground">Verified Local News Archive</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These are historical reports from government sources that reference Tandang Sora, Butuan City.
            They are separate from notices published by Barangay Hall and do not send push notifications.
          </p>
        </div>
        {archiveError && <p role="alert" className="text-sm text-red-700">Unable to load archive: {archiveError.message}</p>}
        {!archiveError && archivedNews.length === 0 && <p className="text-sm text-muted-foreground">No sourced archive records yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {archivedNews.map(item => (
            <article key={item.id} className="space-y-2 rounded-xl border bg-slate-50 p-4">
              <p className="text-xs font-semibold text-blue-800">{item.scope}</p>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs leading-relaxed text-slate-700">{item.summary}</p>
              <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-block text-xs font-semibold text-blue-700 underline underline-offset-2">
                Original report — {item.publisher}
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
