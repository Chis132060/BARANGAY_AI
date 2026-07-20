import { fetchAnnouncements } from "../actions";
import { AnnouncementList } from "./components/AnnouncementList";

export const metadata = {
  title: "Community Announcements",
  description: "Barangay announcements and updates creator.",
};

export default async function AnnouncementsPage() {
  let announcements = [];

  try {
    announcements = await fetchAnnouncements();
  } catch (err) {
    console.error("Database connection offline. Showing fallback announcements.", err);
    // Mock local data fallback if migrations have not been applied yet
    announcements = [
      {
        id: "a1",
        title: "Purok Clean-up Drive this Saturday",
        description: "Join us for our monthly community clean-up drive. Meet at the barangay hall at 6:00 AM. Bring your own cleaning tools.",
        category: "General",
        status: "Published" as const,
        published_date: new Date().toISOString(),
        author: { name: "Secretary Elena" },
      },
      {
        id: "a2",
        title: "Free Vaccination Clinic",
        description: "The health center will conduct free polio and measles vaccinations for children under 5 years old on Wednesday from 8:00 AM to 3:00 PM.",
        category: "Health",
        status: "Published" as const,
        published_date: new Date().toISOString(),
        author: { name: "Captain Roberto" },
      },
    ];
  }

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
