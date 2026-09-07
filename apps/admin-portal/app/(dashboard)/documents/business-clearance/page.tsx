import { Briefcase } from "lucide-react";
import { fetchDocumentRequests } from "../actions";

export const metadata = { title: "Business Clearance | Admin" };

export default async function BusinessClearancePage() {
  let requests: Awaited<ReturnType<typeof fetchDocumentRequests>> = [];
  let error = "";
  try { requests = await fetchDocumentRequests(); } catch (err: any) { error = err.message || "Unable to load business clearance requests."; }
  const clearances = requests.filter((item) => item.document_type?.name?.toLowerCase().includes("business"));
  return <div className="space-y-6"><div className="border-b pb-5"><h1 className="text-3xl font-bold tracking-tight">Business Clearance</h1><p className="mt-1 text-sm text-muted-foreground">Barangay business clearance applications linked to the live document queue.</p></div>{error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}<div className="flex items-center gap-2 text-sm text-muted-foreground"><Briefcase className="h-4 w-4" />{clearances.length} business clearance request(s)</div><div className="overflow-hidden rounded-xl border bg-card shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground"><tr><th className="px-6 py-3">Request ID</th><th className="px-6 py-3">Business / Applicant</th><th className="px-6 py-3">Purpose / Details</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Fee</th></tr></thead><tbody className="divide-y">{clearances.map((item) => <tr key={item.id}><td className="px-6 py-4 font-mono text-xs text-primary">{item.id.slice(0, 12)}</td><td className="px-6 py-4 font-medium">{item.resident ? `${item.resident.first_name} ${item.resident.last_name}` : "Applicant"}</td><td className="max-w-sm px-6 py-4 text-xs text-muted-foreground">{item.form_data?.businessName || item.remarks || "Business details not supplied"}</td><td className="px-6 py-4">{item.status}</td><td className="px-6 py-4 font-bold">₱{Number(item.fee_amount || 0).toFixed(2)}</td></tr>)}</tbody></table>{clearances.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No business clearance requests yet.</p>}</div></div>;
}
