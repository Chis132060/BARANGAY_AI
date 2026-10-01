import { fetchPrograms } from "./actions";
import { ProgramsClient } from "./components/ProgramsClient";

export const metadata = {
  title: "Programs & Councils | Admin",
  description: "Manage barangay programs, councils, and beneficiary enrollment.",
};

export default async function ProgramsPage() {
  let programs = [];
  try {
    programs = await fetchPrograms();
  } catch (err) {
    console.error("Failed to fetch programs:", err);
  }

  return <ProgramsClient initialPrograms={programs} />;
}
