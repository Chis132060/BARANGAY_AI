import { fetchComplaints, updateComplaintStatus } from "../actions";
import { ComplaintsClient } from "./components/ComplaintsClient";

export const metadata = {
  title: "Barangay Complaints & Blotters",
  description: "Governance incident blotters list tracker.",
};

export default async function ComplaintsPage() {
  let initialComplaints = [];

  try {
    initialComplaints = await fetchComplaints();
  } catch (err) {
    console.error("Database connection offline. Displaying fallback blotter cases.", err);
    // Mock local data fallback if migrations have not been applied yet
    initialComplaints = [
      {
        id: "c1",
        complainant_id: "r1",
        respondent_id: "r2",
        category: "Noise Complaint" as const,
        description: "Loud music playing past midnight at residential zone.",
        status: "Filed" as const,
        created_at: new Date().toISOString(),
        complainant: { first_name: "Juan", last_name: "dela Cruz" },
        respondent: { first_name: "Pedro", last_name: "Penduko" },
      },
      {
        id: "c2",
        complainant_id: "r3",
        category: "Garbage" as const,
        description: "Illegal dumping of waste at Purok 2 corner street.",
        status: "Investigation" as const,
        created_at: new Date().toISOString(),
        complainant: { first_name: "Maria", last_name: "Santos" },
      },
    ];
  }

  async function refreshAction(status: string) {
    "use server";
    return fetchComplaints(status);
  }

  async function updateStatusAction(id: string, status: string) {
    "use server";
    await updateComplaintStatus(id, status);
  }

  return (
    <ComplaintsClient
      initialComplaints={initialComplaints}
      onRefresh={refreshAction}
      onUpdateStatus={updateStatusAction}
    />
  );
}
