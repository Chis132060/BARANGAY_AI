import { Calendar, Plus } from "lucide-react";

export const metadata = { title: "Appointments Schedule | Admin" };

const mockAppointments = [
  { refNo: "APT-2026-001", resident: "Gabriel Garcia", purpose: "Captain Consultation", schedule: "2026-07-22 10:00 AM", status: "Confirmed" },
  { refNo: "APT-2026-002", resident: "Rosa Rosal", purpose: "Senior Allowance Inquiry", schedule: "2026-07-22 02:00 PM", status: "Pending Approval" },
];

export default function AppointmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments Schedule</h1>
          <p className="text-sm text-muted-foreground mt-1">Scheduled resident meetings with Barangay Captain & Officials.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Book Appointment
        </button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">Reference No.</th>
              <th className="px-6 py-3">Resident</th>
              <th className="px-6 py-3">Purpose</th>
              <th className="px-6 py-3">Schedule</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {mockAppointments.map((apt) => (
              <tr key={apt.refNo} className="hover:bg-muted/40 transition-colors">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{apt.refNo}</td>
                <td className="px-6 py-4 font-medium">{apt.resident}</td>
                <td className="px-6 py-4 text-muted-foreground">{apt.purpose}</td>
                <td className="px-6 py-4 font-mono text-xs">{apt.schedule}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    apt.status === "Confirmed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {apt.status}
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
