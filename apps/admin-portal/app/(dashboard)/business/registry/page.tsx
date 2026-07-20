import { fetchBusinesses, updateBusinessStatus } from "../actions";
import { BusinessClient } from "./components/BusinessClient";

export const metadata = {
  title: "Business Registry",
  description: "Barangay active businesses directory.",
};

export default async function BusinessRegistryPage() {
  let initialBusinesses = [];

  try {
    initialBusinesses = await fetchBusinesses();
  } catch (err) {
    console.error("Database connection offline. Displaying fallback businesses.", err);
    // Mock local data fallback if migrations have not been applied yet
    initialBusinesses = [
      {
        id: "b1",
        owner_id: "r1",
        business_name: "De la Cruz Sari-Sari Store",
        business_type: "Retail / General Merchandise",
        address: "Purok 4 Rizal St",
        status: "Active" as const,
        owner: { first_name: "Juan", last_name: "dela Cruz" },
      },
      {
        id: "b2",
        owner_id: "r2",
        business_name: "Santos Bakery",
        business_type: "Food Services",
        address: "Purok 2 Magsaysay Ave",
        status: "Pending" as const,
        owner: { first_name: "Maria", last_name: "Santos" },
      },
    ];
  }

  async function refreshAction(status: string) {
    "use server";
    return fetchBusinesses(status);
  }

  async function updateStatusAction(id: string, status: string) {
    "use server";
    await updateBusinessStatus(id, status);
  }

  return (
    <BusinessClient
      initialBusinesses={initialBusinesses}
      onRefresh={refreshAction}
      onUpdateStatus={updateStatusAction}
    />
  );
}
