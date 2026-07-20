import { fetchDocumentRequests, updateRequestStatus } from "../actions";
import { RequestsClient } from "./components/RequestsClient";

export const metadata = {
  title: "Document Requests Queue",
  description: "Barangay document requests tracking queue.",
};

export default async function DocumentRequestsPage() {
  let initialRequests = [];

  try {
    initialRequests = await fetchDocumentRequests();
  } catch (err) {
    console.error("Database connection offline. Showing fallback mock data.", err);
    // Mock local data fallback if migrations have not been applied yet
    initialRequests = [
      {
        id: "1",
        resident_id: "r1",
        resident: { first_name: "Juan", last_name: "dela Cruz" },
        document_type: { name: "Barangay Clearance" },
        status: "Pending" as const,
        requested_date: new Date().toISOString(),
      },
      {
        id: "2",
        resident_id: "r2",
        resident: { first_name: "Maria", last_name: "Santos" },
        document_type: { name: "Certificate of Residency" },
        status: "Approved" as const,
        requested_date: new Date().toISOString(),
      },
    ];
  }

  async function refreshAction(status: string) {
    "use server";
    return fetchDocumentRequests(status);
  }

  async function updateStatusAction(id: string, status: string, remarks = "") {
    "use server";
    return updateRequestStatus(id, status, remarks);
  }

  return (
    <RequestsClient
      initialRequests={initialRequests}
      onRefresh={refreshAction}
      onUpdateStatus={updateStatusAction}
    />
  );
}
