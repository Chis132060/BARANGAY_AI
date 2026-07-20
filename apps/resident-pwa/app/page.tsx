import { redirect } from "next/navigation";

/**
 * Root — redirect to home feed.
 * Unauthenticated users are caught by middleware → /login.
 */
export default function RootPage() {
  redirect("/home");
}
