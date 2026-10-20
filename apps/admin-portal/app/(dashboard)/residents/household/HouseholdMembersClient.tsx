"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHouseholdMember, removeHouseholdMember } from "./actions";
import type { ResidentListItem } from "../actions";

export function HouseholdMembersClient({ householdId, residents, members }: {
  householdId: string;
  residents: ResidentListItem[];
  members: { resident_id: string; first_name: string; last_name: string }[];
}) {
  const [residentId, setResidentId] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const refresh = (action: () => Promise<unknown>) => {
    setError("");
    startTransition(async () => {
      try { await action(); setResidentId(""); router.refresh(); }
      catch (err) { setError(err instanceof Error ? err.message : "Unable to update household"); }
    });
  };
  return <div className="space-y-2 rounded-xl border p-3">
    <h3 className="text-xs font-bold">Members ({members.length})</h3>
    {members.map(m => <div key={m.resident_id} className="flex items-center justify-between gap-2 text-xs">
      <span>{m.first_name} {m.last_name}</span>
      <button type="button" disabled={pending} className="rounded border px-2 py-1" onClick={() => refresh(() => removeHouseholdMember(householdId,m.resident_id))}>Remove</button>
    </div>)}
    <div className="flex flex-wrap gap-2">
      <select aria-label="Resident to add" value={residentId} onChange={e => setResidentId(e.target.value)} className="min-w-48 rounded border p-2 text-xs">
        <option value="">Select resident</option>
        {residents.filter(r => !members.some(m => m.resident_id === r.id)).map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
      </select>
      <button type="button" disabled={!residentId || pending} onClick={() => refresh(() => addHouseholdMember(householdId,residentId))} className="rounded bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50">Add member</button>
    </div>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
