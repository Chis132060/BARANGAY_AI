import { fetchAnnouncements } from "../actions";
import { AnnouncementList } from "./components/AnnouncementList";

export const metadata = {
  title: "Community Announcements",
  description: "Barangay announcements and updates creator.",
};

export default async function AnnouncementsPage() {
  const announcements = await fetchAnnouncements();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barangay Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Publish news updates, emergency warnings, and community bulletins.</p>
        </div>
      </div>

      <AnnouncementList announcements={announcements} />
    </div>
  );
}
