import { Bell, Plus, Send } from "lucide-react";

export const metadata = { title: "Notifications Center | Admin" };

const mockNotifications = [
  { id: "NOTIF-01", title: "Monthly General Assembly Notice", recipient: "All Verified Residents", channel: "PWA Push & SMS", date: "2026-07-20 09:00 AM", status: "Sent" },
  { id: "NOTIF-02", title: "Typhoon Warning Alert", recipient: "Flood Zone Residents", channel: "PWA Broadcast", date: "2026-07-18 04:30 PM", status: "Sent" },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Broadcast SMS and PWA push notifications to residents.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Send className="h-4 w-4" /> Send Notification
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Notification Title</th>
              <th className="px-6 py-3">Audience</th>
              <th className="px-6 py-3">Channel</th>
              <th className="px-6 py-3">Timestamp</th>
              <th className="px-6 py-3">Delivery Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockNotifications.map((notif) => (
              <tr key={notif.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-medium">{notif.title}</td>
                <td className="px-6 py-4 text-muted-foreground">{notif.recipient}</td>
                <td className="px-6 py-4 font-mono text-xs">{notif.channel}</td>
                <td className="px-6 py-4 font-mono text-xs">{notif.date}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {notif.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
