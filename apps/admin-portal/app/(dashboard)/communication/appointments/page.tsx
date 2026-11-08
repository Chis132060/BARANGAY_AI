import { createAppointmentForResident, fetchAppointments, fetchBookableResidents, updateAppointmentStatus } from "../actions";
import { AppointmentsClient } from "./AppointmentsClient";

export const metadata = { title: "Appointments Schedule | Admin" };

export default async function AppointmentsPage() {
  let appointments: Awaited<ReturnType<typeof fetchAppointments>> = [];
  let residents: Awaited<ReturnType<typeof fetchBookableResidents>> = [];
  let error = "";
  try {
    [appointments, residents] = await Promise.all([fetchAppointments(), fetchBookableResidents()]);
  } catch (err: any) {
    error = err.message || "Unable to load appointments.";
  }
  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
      <AppointmentsClient
        appointments={appointments}
        residents={residents}
        onCreate={async (input) => { "use server"; return createAppointmentForResident(input); }}
        onStatusChange={async (id, status) => { "use server"; return updateAppointmentStatus(id, status); }}
      />
    </div>
  );
}
