import { fetchBoarders } from "./actions";
import { BoardersClient } from "./components/BoardersClient";

export const metadata = {
  title: "Boarders Profile | Admin",
  description: "Registry of boarders and renters within the barangay.",
};

export default async function BoardersPage() {
  let boarders = [];
  try {
    boarders = await fetchBoarders();
  } catch (err) {
    console.error("Failed to fetch boarders:", err);
  }

  return <BoardersClient initialBoarders={boarders} />;
}
