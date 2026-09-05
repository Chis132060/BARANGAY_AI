import { Calendar } from "lucide-react";
import { fetchAppointments } from "../actions";

export const metadata = { title: "Appointments Schedule | Admin" };

export default async function AppointmentsPage() {
  let appointments: Awaited<ReturnType<typeof fetchAppointments>> = [];
  let error = "";
  try { appointments = await fetchAppointments(); } catch (err: any) { error = err.message || "Unable to load appointments."; }
  return <div className="space-y-6"><div className="border-b pb-5"><h1 className="text-3xl font-bold tracking-tight">Appointments Schedule</h1><p className="mt-1 text-sm text-muted-foreground">Live resident appointments from the communication workflow.</p></div>{error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}<div className="overflow-hidden rounded-xl border bg-card shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground"><tr><th className="px-6 py-3">Resident</th><th className="px-6 py-3">Purpose</th><th className="px-6 py-3">Schedule</th><th className="px-6 py-3">Status</th></tr></thead><tbody className="divide-y">{appointments.map((item) => <tr key={item.id}><td className="px-6 py-4 font-medium">{item.resident ? `${item.resident.first_name} ${item.resident.last_name}` : "Resident"}</td><td className="px-6 py-4">{item.type}</td><td className="px-6 py-4"><span className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{new Date(item.schedule_date).toLocaleString()}</span></td><td className="px-6 py-4">{item.status}</td></tr>)}</tbody></table>{appointments.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No appointments recorded.</p>}</div></div>;
}
