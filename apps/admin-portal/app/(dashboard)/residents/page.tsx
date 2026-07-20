import { fetchResidents } from "./actions";
import { ResidentsClient } from "./components/ResidentsClient";

export const metadata = {
  title: "Residents Registry",
  description: "Barangay Residents database and registry details.",
};

export default async function ResidentsPage() {
  let initialResidents = [];

  try {
    initialResidents = await fetchResidents();
  } catch (err) {
    console.error("Database connection offline. Showing empty fallback state.", err);
    // Mock local data fallback if migrations have not been applied yet
    initialResidents = [
      {
        id: "1",
        first_name: "Juan",
        last_name: "dela Cruz",
        birth_date: "1990-05-12",
        gender: "Male",
        civil_status: "Married",
        contact_number: "09171234567",
        voter_status: true,
        senior_status: false,
        pwd_status: false,
        four_ps_status: true,
        address: { house_number: "12", street: "Rizal St", purok: "4" },
      },
      {
        id: "2",
        first_name: "Maria",
        last_name: "Santos",
        birth_date: "1945-11-23",
        gender: "Female",
        civil_status: "Widowed",
        contact_number: "09187654321",
        voter_status: true,
        senior_status: true,
        pwd_status: false,
        four_ps_status: false,
        address: { house_number: "45B", street: "Magsaysay Ave", purok: "2" },
      },
    ];
  }

  return <ResidentsClient initialResidents={initialResidents} onRefresh={fetchResidents} />;
}
