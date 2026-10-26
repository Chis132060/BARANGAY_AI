import { fetchBusinesses, updateBusinessStatus } from "../actions";
import { BusinessClient } from "./components/BusinessClient";

export const metadata = {
  title: "Business Registry",
  description: "Barangay active businesses directory.",
};

export default async function BusinessRegistryPage() {
  const initialBusinesses = await fetchBusinesses();

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
