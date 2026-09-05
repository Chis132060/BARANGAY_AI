import { CreditCard } from "lucide-react";
import { fetchDocumentRequests } from "@/app/(dashboard)/documents/actions";

export const metadata = { title: "Transaction History | Admin" };

export default async function TransactionsPage() {
  let requests: Awaited<ReturnType<typeof fetchDocumentRequests>> = [];
  let error = "";
  try { requests = await fetchDocumentRequests(); } catch (err: any) { error = err.message || "Unable to load transaction history."; }
  const paid = requests.filter((item) => item.payment_status === "Paid" || item.payment_status === "Waived" || item.payment_status === "Free");
  return <div className="space-y-6"><div className="border-b pb-5"><h1 className="text-3xl font-bold tracking-tight">Transaction History</h1><p className="mt-1 text-sm text-muted-foreground">Live document fees, payment status, and processing activity.</p></div>{error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}<div className="flex items-center gap-2 text-sm text-muted-foreground"><CreditCard className="h-4 w-4" />{paid.length} recorded paid/waived/free transaction(s)</div><div className="overflow-hidden rounded-xl border bg-card shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground"><tr><th className="px-6 py-3">Resident</th><th className="px-6 py-3">Particulars</th><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Date</th><th className="px-6 py-3">Payment</th></tr></thead><tbody className="divide-y">{requests.map((item) => <tr key={item.id}><td className="px-6 py-4 font-medium">{item.resident ? `${item.resident.first_name} ${item.resident.last_name}` : "Applicant"}</td><td className="px-6 py-4">{item.document_type?.name || "Barangay document"}</td><td className="px-6 py-4 font-bold">₱{Number(item.fee_amount || 0).toFixed(2)}</td><td className="px-6 py-4 font-mono text-xs">{new Date(item.requested_date).toLocaleString()}</td><td className="px-6 py-4">{item.payment_status}</td></tr>)}</tbody></table>{requests.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No document transactions recorded.</p>}</div></div>;
}
