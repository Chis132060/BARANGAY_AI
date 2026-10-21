import { fetchDocumentRequests, updateRequestStatus, verifyPayment, DocumentRequestItem } from "../actions";
import { RequestsClient } from "./components/RequestsClient";

export const metadata = {
  title: "Document Requests Queue | Smart Barangay Admin",
  description: "Barangay document requests tracking queue and certificate generator.",
};

export default async function DocumentRequestsPage() {
  let initialRequests: DocumentRequestItem[] = [];
  let loadError = false;

  try {
    initialRequests = await fetchDocumentRequests();
  } catch (err) {
    console.error("Unable to load document requests:", err);
    loadError = true;
    // Never display fabricated resident requests when the database is unavailable.
    initialRequests = [];
  }

  return (
    <div>
      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          Document requests could not be loaded. The queue below may be incomplete. Please refresh the page or contact an administrator before processing requests.
        </div>
      )}
      <RequestsClient
      initialRequests={initialRequests}
      onRefresh={fetchDocumentRequests}
      onUpdateStatus={updateRequestStatus}
      onVerifyPayment={verifyPayment}
      />
    </div>
  );
}
