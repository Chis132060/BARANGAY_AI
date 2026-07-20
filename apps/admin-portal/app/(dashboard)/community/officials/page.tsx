import { fetchOfficials } from "../actions";
import { OfficialsTable } from "./components/OfficialsTable";

export const metadata = {
  title: "Barangay Officials",
  description: "Governance directory listing current Barangay Officials.",
};

export default async function OfficialsPage() {
  let officials = [];

  try {
    officials = await fetchOfficials();
  } catch (err) {
    console.error("Database connection offline. Showing fallback mock governance list.", err);
    // Mock local data fallback if migrations have not been applied yet
    officials = [
      {
        id: "o1",
        resident_id: "r1",
        position: "Barangay Captain",
        start_term: "2023-11-30",
        status: "Active" as const,
        resident: { first_name: "Roberto", last_name: "Cruz" },
      },
      {
        id: "o2",
        resident_id: "r2",
        position: "Barangay Secretary",
        start_term: "2023-11-30",
        status: "Active" as const,
        resident: { first_name: "Elena", last_name: "Santos" },
      },
    ];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barangay Officials</h1>
          <p className="text-sm text-muted-foreground mt-1">Directory of active officials and active governance terms.</p>
        </div>
      </div>

      <OfficialsTable officials={officials} />
    </div>
  );
}
