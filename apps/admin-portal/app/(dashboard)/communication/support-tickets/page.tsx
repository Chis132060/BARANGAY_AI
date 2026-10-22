import { fetchSupportTickets } from "./actions";
import { SupportTicketsClient } from "./SupportTicketsClient";
export const metadata={title:"Support Tickets | Smart Barangay"};
export const dynamic="force-dynamic";
export default async function SupportTicketsPage() {
 try {
  const tickets=await fetchSupportTickets();
  return <main className="space-y-6"><header><h1 className="text-3xl font-bold">Support Tickets</h1><p className="text-sm text-muted-foreground">Manage resident help requests and communicate status updates.</p></header><SupportTicketsClient initialTickets={tickets}/></main>;
 } catch {
  return <main role="alert" className="rounded-lg border p-5">Support tickets could not be loaded. Check your communication permissions or database migration.</main>;
 }
}
