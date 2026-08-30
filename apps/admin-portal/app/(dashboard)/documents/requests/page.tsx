import { fetchDocumentRequests, updateRequestStatus, DocumentRequestItem } from "../actions";
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
    console.error("Database connection offline. Showing initial mock requests.", err);
    initialRequests = [
      {
        id: "REQ-2026-001",
        resident_id: "r1",
        resident: {
          first_name: "Juan",
          last_name: "dela Cruz",
          civil_status: "Single",
          addresses: [{ house_number: "123", street: "Mabini St.", purok: "Purok 2" }],
        },
        document_type: { name: "Barangay Clearance" },
        status: "Pending" as const,
        fee_amount: 50.0,
        payment_status: "Unpaid" as const,
        remarks: "Employment at Tech Park",
        requested_date: new Date().toISOString(),
      },
      {
        id: "REQ-2026-002",
        resident_id: "r2",
        resident: {
          first_name: "Maria",
          last_name: "Santos",
          civil_status: "Married",
          addresses: [{ house_number: "45", street: "Rizal Ave.", purok: "Purok 4" }],
        },
        document_type: { name: "Certificate of Indigency" },
        status: "Ready for Pickup" as const,
        fee_amount: 0.0,
        payment_status: "Free" as const,
        pickup_instructions: "Window 2, bring 1 Valid ID.",
        remarks: "Medical Assistance for Hospitalization",
        requested_date: new Date().toISOString(),
      },
      {
        id: "REQ-2026-003",
        resident_id: "r3",
        resident: {
          first_name: "Antonio",
          last_name: "Luna",
          civil_status: "Single",
          addresses: [{ house_number: "88", street: "Bonifacio St.", purok: "Purok 1" }],
        },
        document_type: { name: "Certificate of Residency" },
        status: "Approved" as const,
        fee_amount: 30.0,
        payment_status: "Unpaid" as const,
        remarks: "Bank Account Opening Requirement",
        requested_date: new Date().toISOString(),
      },
    ];
  }

  return (
    <RequestsClient
      initialRequests={initialRequests}
      onRefresh={fetchDocumentRequests}
      onUpdateStatus={updateRequestStatus}
    />
  );
}
