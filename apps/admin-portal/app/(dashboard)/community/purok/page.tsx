import { MapPin } from "lucide-react";
import { createPurok, fetchPuroks } from "../actions";
import { PurokCreateForm } from "./PurokCreateForm";

export const metadata = { title: "Purok Management | Admin" };

export default async function PurokPage() {
  let puroks: Awaited<ReturnType<typeof fetchPuroks>> = [];
  let error = "";
  try { puroks = await fetchPuroks(); } catch (err: any) { error = err.message || "Unable to load purok records."; }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5"><div><h1 className="text-3xl font-bold tracking-tight">Purok Management</h1><p className="mt-1 text-sm text-muted-foreground">Live territorial assignments and purok leaders from the barangay database.</p></div><PurokCreateForm onCreate={async (name) => { "use server"; return createPurok(name); }} /></div>
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
      {puroks.length === 0 ? <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">No purok records have been configured yet.</div> : <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{puroks.map((purok) => <div key={purok.id} className="space-y-3 rounded-xl border bg-card p-5 shadow-sm"><div className="flex items-center gap-2 font-bold text-primary"><MapPin className="h-5 w-5" /><h3>{purok.name}</h3></div><p className="text-xs text-muted-foreground">Assigned Leader: <span className="font-semibold text-foreground">{purok.leader ? `${purok.leader.first_name} ${purok.leader.last_name}` : "Unassigned"}</span></p></div>)}</div>}
    </div>
  );
}
