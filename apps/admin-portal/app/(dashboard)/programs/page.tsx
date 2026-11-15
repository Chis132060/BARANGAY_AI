import { BarangayProgram, fetchPrograms } from "./actions";
import { ProgramsClient } from "./components/ProgramsClient";

export const metadata = {
  title: "Programs & Activities | Admin",
  description: "Manage barangay programs, participant applications, and attendance.",
};

export default async function ProgramsPage() {
  let programs: BarangayProgram[] = [];
  let loadError: string | null = null;
  try {
    programs = await fetchPrograms();
  } catch (err) {
    console.error("Failed to fetch programs:", err);
    loadError = "Unable to load programs. Check your permissions or connection and retry.";
  }

  return <ProgramsClient initialPrograms={programs} loadError={loadError} />;
}
