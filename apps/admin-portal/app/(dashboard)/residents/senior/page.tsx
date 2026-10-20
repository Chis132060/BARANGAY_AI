import { AdminTable } from "@/components/ui/AdminTable";
import { Heart } from "lucide-react";
import { SeniorExport } from "./SeniorExport";
import { fetchResidents } from "../actions";

export const metadata = { title: "Senior Citizen Registry | Admin" };

function ageOf(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

export default async function SeniorPage() {
  let seniors: Awaited<ReturnType<typeof fetchResidents>> = [];
  let inconsistent: Awaited<ReturnType<typeof fetchResidents>> = [];
  let error = "";
  try { const all = await fetchResidents(); seniors = all.filter((resident) => ageOf(resident.birth_date) >= 60); inconsistent = all.filter((resident) => resident.senior_status && ageOf(resident.birth_date) < 60); } catch (err: any) { error = err.message || "Unable to load senior citizen records."; }
  return <div className="space-y-6">
    <div className="flex items-center justify-between border-b pb-5"><div><h1 className="text-3xl font-bold tracking-tight">Senior Citizen Registry</h1><p className="mt-1 text-sm text-muted-foreground">Live senior citizen records from the barangay resident registry.</p></div><SeniorExport residents={seniors} /></div>
    {!error && inconsistent.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{inconsistent.length} flagged senior record(s) are under 60 based on recorded birth dates. Review classifications before issuing reports.</div>}
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="overflow-x-auto"><AdminTable className="w-full min-w-[680px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3">Resident ID</th><th className="px-6 py-3">Full Name</th><th className="px-6 py-3">Age</th><th className="px-6 py-3">Gender</th><th className="px-6 py-3">Verification</th></tr></thead><tbody className="divide-y">{seniors.map((senior) => <tr key={senior.id} className="hover:bg-muted/40"><td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{senior.id.slice(0, 8)}</td><td className="px-6 py-4 font-medium">{senior.first_name} {senior.last_name}</td><td className="px-6 py-4 font-semibold">{ageOf(senior.birth_date)} yrs</td><td className="px-6 py-4 text-muted-foreground">{senior.gender}</td><td className="px-6 py-4"><span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800"><Heart className="h-3 w-3" />{senior.verification_status || "Recorded"}</span></td></tr>)}</tbody></AdminTable></div>{!error && seniors.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No senior citizen records found.</p>}</div>
  </div>;
}
