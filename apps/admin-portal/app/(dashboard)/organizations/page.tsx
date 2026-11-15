import { BarangayOrganization, fetchOrganizations } from "./actions";
import { OrganizationsClient } from "./components/OrganizationsClient";

export const metadata = {
  title: "Organizations | Admin",
  description: "Community and sectoral organizations within the barangay.",
};

export default async function OrganizationsPage() {
  let organizations: BarangayOrganization[] = [];
  let loadError: string | null = null;
  try {
    organizations = await fetchOrganizations();
  } catch (err) {
    console.error("Failed to fetch organizations:", err);
    loadError = "Unable to load organizations. Check permissions or connection and retry.";
  }

  return <OrganizationsClient initialOrganizations={organizations} loadError={loadError} />;
}
