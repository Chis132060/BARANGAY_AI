import { MapPin } from "lucide-react";
import { createPrecinct, fetchPrecincts } from "../actions";
import { PrecinctCreateForm } from "./PrecinctCreateForm";

export const metadata = { title: "Precinct Management | Admin" };

export default async function PrecinctPage() {
  let precincts: Awaited<ReturnType<typeof fetchPrecincts>> = [];
  let error = "";
  try { precincts = await fetchPrecincts(); } catch (err: any) { error = err.message || "Unable to load precinct records."; }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5"><div><h1 className="text-3xl font-bold tracking-tight">Precinct Management</h1><p className="mt-1 text-sm text-muted-foreground">Live electoral precinct and polling location records.</p></div><PrecinctCreateForm onCreate={async (number, location) => { "use server"; return createPrecinct(number, location); }} /></div>
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
      {precincts.length === 0 ? <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">No precinct records have been configured yet.</div> : <div className="overflow-hidden rounded-xl border bg-card shadow-sm"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/50 text-xs font-semibold uppercase text-muted-foreground"><tr><th className="px-6 py-3">Precinct No.</th><th className="px-6 py-3">Polling Location</th></tr></thead><tbody className="divide-y">{precincts.map((item) => <tr key={item.id}><td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{item.number}</td><td className="flex items-center gap-2 px-6 py-4"><MapPin className="h-4 w-4 text-muted-foreground" />{item.location || "Location not recorded"}</td></tr>)}</tbody></table></div>}
    </div>
  );
}
