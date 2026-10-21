import { fetchResidents } from "./actions";
import { ResidentsClient } from "./components/ResidentsClient";

export const metadata = {
  title: "Residents Registry",
  description: "Barangay Residents database and registry details.",
};

interface ResidentsPageProps {
  searchParams?: {
    search?: string;
  };
}

export default async function ResidentsPage({ searchParams }: ResidentsPageProps) {
  let initialResidents = [];
  const initialSearch = searchParams?.search ?? "";

  try {
    initialResidents = await fetchResidents();
  } catch (err) {
    console.error("Unable to load resident records:", err);
    // Never display invented personal records if the registry cannot be loaded.
    return (
      <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5 text-sm text-red-900">
        Resident records could not be loaded. Please retry or contact an administrator.
        No registry data is shown while the connection is unavailable.
      </div>
    );
  }

  return (
    <ResidentsClient
      initialResidents={initialResidents}
      initialSearch={initialSearch}
      onRefresh={fetchResidents}
    />
  );
}
