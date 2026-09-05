import { Award } from "lucide-react";
import { fetchResidents } from "../actions";

export const metadata = { title: "4Ps Beneficiaries | Admin" };

export default async function FourPsPage() {
  let residents: Awaited<ReturnType<typeof fetchResidents>> = [];
  let error = "";
  try { residents = await fetchResidents("", "4Ps"); } catch (err: any) { error = err.message || "Unable to load 4Ps records."; }
  return <div className="space-y-6">
    <div className="border-b pb-5"><h1 className="text-3xl font-bold tracking-tight">4Ps Beneficiaries</h1><p className="mt-1 text-sm text-muted-foreground">Live Pantawid Pamilyang Pilipino Program flags from the resident registry.</p></div>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3">Resident ID</th><th className="px-6 py-3">Beneficiary Name</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Purok</th><th className="px-6 py-3">Verification</th></tr></thead><tbody className="divide-y">{residents.map((resident) => <tr key={resident.id} className="hover:bg-muted/40"><td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{resident.id.slice(0, 8)}</td><td className="px-6 py-4 font-medium">{resident.first_name} {resident.last_name}</td><td className="px-6 py-4 text-muted-foreground">{resident.contact_number || "N/A"}</td><td className="px-6 py-4 text-muted-foreground">{resident.address?.purok || "Not recorded"}</td><td className="px-6 py-4"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"><Award className="h-3 w-3" />{resident.verification_status || "Recorded"}</span></td></tr>)}</tbody></table></div>{!error && residents.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No 4Ps records found.</p>}</div>
  </div>;
}
