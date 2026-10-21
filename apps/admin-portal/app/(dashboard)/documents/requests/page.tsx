import { fetchDocumentRequests, updateRequestStatus, verifyPayment, DocumentRequestItem } from "../actions";
import { RequestsClient } from "./components/RequestsClient";

export const metadata = {
  title: "Document Requests Queue | Smart Barangay Admin",
  description: "Barangay document requests tracking queue and certificate generator.",
};

export default async function DocumentRequestsPage() {
  let initialRequests: DocumentRequestItem[] = [];

  try {
    initialRequests = await fetchDocumentRequests();
  } catch (err) {
    console.error("Unable to load document requests:", err);
    // Never display fabricated resident requests when the database is unavailable.
    initialRequests = [];
  }

  return (
    <RequestsClient
      initialRequests={initialRequests}
      onRefresh={fetchDocumentRequests}
      onUpdateStatus={updateRequestStatus}
      onVerifyPayment={verifyPayment}
    />
  );
}
