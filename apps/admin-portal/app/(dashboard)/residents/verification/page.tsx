import { VerificationQueueClient } from "./components/VerificationQueueClient";
import { fetchPendingVerifications } from "../actions";

export const metadata = { title: "Verification Queue | Admin" };

export default async function VerificationQueuePage() {
  let pendingResidents: any[] = [];
  let error: string | null = null;
  try {
    pendingResidents = await fetchPendingVerifications();
  } catch (err: any) {
    error = err.message || "Failed to load verification queue";
  }

  return <VerificationQueueClient initialResidents={pendingResidents} error={error} />;
}
