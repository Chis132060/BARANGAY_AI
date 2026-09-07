import { FileCheck } from "lucide-react";
import { fetchDocumentRequests } from "../actions";

export const metadata = { title: "Certificates Issuance | Admin" };

export default async function CertificatesPage() {
  let requests: Awaited<ReturnType<typeof fetchDocumentRequests>> = [];
  let error = "";
  try { requests = await fetchDocumentRequests(); } catch (err: any) { error = err.message || "Unable to load certificate records."; }
  const certificates = requests.filter((item) => ["Approved", "Ready for Pickup", "Released", "Completed"].includes(item.status));
  return <div className="space-y-6"><div className="border-b pb-5"><h1 className="text-3xl font-bold tracking-tight">Certificates Issuance</h1><p className="mt-1 text-sm text-muted-foreground">Issued and approved certificates derived from document requests.</p></div>{error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}<div className="flex items-center gap-2 text-sm text-muted-foreground"><FileCheck className="h-4 w-4" />{certificates.length} certificate record(s)</div><div className="overflow-hidden rounded-xl border bg-card shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground"><tr><th className="px-6 py-3">Request ID</th><th className="px-6 py-3">Document Type</th><th className="px-6 py-3">Recipient</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Requested</th></tr></thead><tbody className="divide-y">{certificates.map((item) => <tr key={item.id}><td className="px-6 py-4 font-mono text-xs text-primary">{item.id.slice(0, 12)}</td><td className="px-6 py-4 font-medium">{item.document_type?.name || "Certificate"}</td><td className="px-6 py-4">{item.resident ? `${item.resident.first_name} ${item.resident.last_name}` : "Applicant"}</td><td className="px-6 py-4">{item.status}</td><td className="px-6 py-4 font-mono text-xs">{new Date(item.requested_date).toLocaleDateString()}</td></tr>)}</tbody></table>{certificates.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No approved or issued certificates yet.</p>}</div></div>;
}
