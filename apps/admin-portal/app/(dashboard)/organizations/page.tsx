import { fetchOrganizations } from "./actions";
import { OrganizationsClient } from "./components/OrganizationsClient";

export const metadata = {
  title: "Organizations | Admin",
  description: "Community and sectoral organizations within the barangay.",
};

export default async function OrganizationsPage() {
  let organizations = [];
  try {
    organizations = await fetchOrganizations();
  } catch (err) {
    console.error("Failed to fetch organizations:", err);
  }

  return <OrganizationsClient initialOrganizations={organizations} />;
}
