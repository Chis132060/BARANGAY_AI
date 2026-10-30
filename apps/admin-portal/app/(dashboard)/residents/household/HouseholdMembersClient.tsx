"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { addHouseholdMember, createFamilyResident, removeHouseholdMember } from "./actions";
import type { ResidentListItem } from "../actions";

type Member = { resident_id: string; first_name: string; last_name: string; relationship?: string | null };

export function HouseholdMembersClient({ householdId, householdNumber, residents, members }: {
  householdId: string;
  householdNumber: string;
  residents: ResidentListItem[];
  members: Member[];
}) {
  const [open, setOpen] = useState(false);
  const [residentId, setResidentId] = useState("");
  const [residentSearch, setResidentSearch] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [familyForm, setFamilyForm] = useState<{ first_name: string; middle_name: string; last_name: string; birth_date: string; gender: "" | "Male" | "Female" | "Other"; relationship: string }>({ first_name: "", middle_name: "", last_name: "", birth_date: "", gender: "", relationship: "" });
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const availableResidents = residents.filter(r =>
    !members.some(m => m.resident_id === r.id) &&
    `${r.first_name} ${r.middle_name || ""} ${r.last_name}`.toLowerCase().includes(residentSearch.trim().toLowerCase())
  );

  function run(action: () => Promise<unknown>) {
    setError("");
    startTransition(async () => {
      try { await action(); setResidentId(""); router.refresh(); }
      catch (err) { setError(err instanceof Error ? err.message : "Unable to update household"); }
    });
  }

  function submitFamily(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    run(async () => {
      if (!familyForm.gender) throw new Error("Select the resident's gender.");
      await createFamilyResident({ householdId, ...familyForm, gender: familyForm.gender });
      setFamilyForm({ first_name: "", middle_name: "", last_name: "", birth_date: "", gender: "", relationship: "" });
    });
  }

  return <>
    <td className="px-4 py-3 text-xs text-muted-foreground">{members.length} resident{members.length === 1 ? "" : "s"}</td>
    <td className="px-4 py-3"><button type="button" onClick={() => { setOpen(true); setError(""); setCopyMessage(""); }} className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted">View</button></td>
    {open && createPortal(<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onClick={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-labelledby={`household-${householdId}-title`} onClick={e => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border bg-card p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b pb-4"><div><h2 id={`household-${householdId}-title`} className="text-lg font-bold">Household members</h2><p className="text-xs text-muted-foreground">Only add a family member if this household membership has been confirmed.</p><div className="mt-2 flex items-center gap-2"><code className="rounded bg-muted px-2 py-1 text-xs">{householdNumber || "No household code"}</code><button type="button" disabled={!householdNumber} onClick={() => void navigator.clipboard.writeText(householdNumber).then(() => setCopyMessage("Household code copied."), () => setCopyMessage("Could not copy code. Please copy it manually."))} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Copy code</button></div>{copyMessage && <p role="status" className="mt-1 text-xs text-muted-foreground">{copyMessage}</p>}</div><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-1.5 text-xs">Close</button></div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-4"><h3 className="text-sm font-semibold">Linked residents ({members.length})</h3>{members.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No residents linked yet.</p> : <ul className="mt-2 divide-y rounded-xl border">{members.map(m => <li key={m.resident_id} className="flex items-center justify-between gap-3 p-3 text-sm"><span><strong>{m.first_name} {m.last_name}</strong>{m.relationship && <span className="ml-2 text-xs text-muted-foreground">{m.relationship}</span>}</span><button type="button" disabled={pending} onClick={() => run(() => removeHouseholdMember(householdId,m.resident_id))} className="rounded border px-2 py-1 text-xs text-red-700 disabled:opacity-50">Remove</button></li>)}</ul>}</div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <form onSubmit={event => { event.preventDefault(); if (residentId) run(() => addHouseholdMember(householdId,residentId)); }} className="space-y-2 rounded-xl border p-4"><h3 className="text-sm font-semibold">Link existing resident</h3><p className="text-xs text-muted-foreground">Search for a verified resident. Residents can only belong to one household.</p><input aria-label="Search residents" type="search" placeholder="Search by first, middle, or last name" value={residentSearch} onChange={e => { setResidentSearch(e.target.value); setResidentId(""); }} className="w-full rounded-lg border p-2 text-sm"/><select aria-label="Search results: choose resident" value={residentId} onChange={e => setResidentId(e.target.value)} className="w-full rounded-lg border p-2 text-sm"><option value="">{availableResidents.length ? "Select matching resident" : "No matching unlinked residents"}</option>{availableResidents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.middle_name ? `${r.middle_name} ` : ""}{r.last_name}</option>)}</select><button type="submit" disabled={!residentId || pending} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{pending ? "Saving…" : "Link resident"}</button></form>
          <form onSubmit={submitFamily} className="space-y-2 rounded-xl border p-4"><h3 className="text-sm font-semibold">Add family member record</h3><p className="text-xs text-muted-foreground">Creates a resident record as Pending; staff must verify it before account access.</p><div className="grid grid-cols-2 gap-2"><input required aria-label="First name" placeholder="First name *" value={familyForm.first_name} onChange={e => setFamilyForm(f => ({...f,first_name:e.target.value}))} className="rounded-lg border p-2 text-sm"/><input aria-label="Middle name" placeholder="Middle name" value={familyForm.middle_name} onChange={e => setFamilyForm(f => ({...f,middle_name:e.target.value}))} className="rounded-lg border p-2 text-sm"/><input required aria-label="Last name" placeholder="Last name *" value={familyForm.last_name} onChange={e => setFamilyForm(f => ({...f,last_name:e.target.value}))} className="rounded-lg border p-2 text-sm"/><input required aria-label="Birth date" type="date" value={familyForm.birth_date} onChange={e => setFamilyForm(f => ({...f,birth_date:e.target.value}))} className="rounded-lg border p-2 text-sm"/><select required aria-label="Gender" value={familyForm.gender} onChange={e => setFamilyForm(f => ({...f,gender:e.target.value as typeof f.gender}))} className="rounded-lg border p-2 text-sm"><option value="">Gender *</option><option>Male</option><option>Female</option><option>Other</option></select></div><input aria-label="Relationship to household head" placeholder="Relationship (e.g. child)" value={familyForm.relationship} onChange={e => setFamilyForm(f => ({...f,relationship:e.target.value}))} className="w-full rounded-lg border p-2 text-sm"/><button type="submit" disabled={pending} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">{pending ? "Saving…" : "Create pending resident"}</button></form>
        </div>
      </section>
    </div>, document.body)}
  </>;
}
