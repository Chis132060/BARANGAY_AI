import { fetchBusinesses, fetchBusinessPermits, issueBusinessPermit, updateBusinessPermitStatus } from "../actions";
import { BusinessPermitsClient } from "./components/BusinessPermitsClient";

export const metadata = { title: "Business Permits | Admin" };

export default async function PermitsPage() {
  let permits: Awaited<ReturnType<typeof fetchBusinessPermits>> = [];
  let businesses: Awaited<ReturnType<typeof fetchBusinesses>> = [];
  let error = "";
  try {
    [permits, businesses] = await Promise.all([fetchBusinessPermits(), fetchBusinesses()]);
  } catch (err: any) {
    error = err.message || "Unable to load business permits.";
  }

  async function refreshAction(status: string) {
    "use server";
    return fetchBusinessPermits(status);
  }

  async function issueAction(input: Parameters<typeof issueBusinessPermit>[0]) {
    "use server";
    return issueBusinessPermit(input);
  }

  async function updateAction(id: string, status: "Active" | "Expired" | "Revoked") {
    "use server";
    return updateBusinessPermitStatus(id, status);
  }

  return <BusinessPermitsClient initialPermits={permits} businesses={businesses} initialError={error} onRefresh={refreshAction} onIssue={issueAction} onUpdateStatus={updateAction} />;
}
