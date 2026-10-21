import { BoarderListItem, fetchBoarders } from "./actions";
import { BoardersClient } from "./components/BoardersClient";

export const metadata = {
  title: "Boarders Profile | Admin",
  description: "Registry of boarders and renters within the barangay.",
};

export default async function BoardersPage() {
  let boarders: BoarderListItem[] = [];
  let error: string | null = null;
  try {
    boarders = await fetchBoarders();
  } catch (err) {
    console.error("Failed to fetch boarders:", err);
    error = "Unable to load boarder records. Please retry later.";
  }

  return <>{error && <div role="alert" className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}<BoardersClient initialBoarders={boarders} /></>;
}
