"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Eye, Trash2, X, UserMinus } from "lucide-react";
import { addHouseholdMember, removeHouseholdMember, deleteHousehold } from "./actions";
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
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  function handleDeleteHousehold() {
    run(async () => {
      await deleteHousehold(householdId);
      setConfirmDelete(false);
      setOpen(false);
    });
  }

  return <>
    <td className="px-4 py-3 text-xs text-muted-foreground">{members.length} resident{members.length === 1 ? "" : "s"}</td>
    <td className="px-4 py-3">
      <div className="flex items-center justify-end gap-1">
        {/* View members */}
        <button
          type="button"
          onClick={() => { setOpen(true); setError(""); setCopyMessage(""); setConfirmDelete(false); }}
          title="View household members"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Eye className="h-4 w-4" />
        </button>
        {/* Delete household */}
        <button
          type="button"
          onClick={() => { setConfirmDelete(true); setOpen(false); }}
          title="Delete household"
          disabled={pending}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </td>

    {/* Delete Confirm Modal */}
    {confirmDelete && createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(false)}>
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border space-y-4" onClick={e => e.stopPropagation()}>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Delete household?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Household <span className="font-mono font-semibold">{householdNumber || "—"}</span> and all its member links will be permanently removed. Residents themselves are not deleted.
            </p>
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={() => setConfirmDelete(false)} className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
            <button type="button" disabled={pending} onClick={handleDeleteHousehold} className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50">
              {pending ? "Deleting…" : "Delete household"}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* View Members Modal */}
    {open && createPortal(
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onClick={() => setOpen(false)}>
        <section role="dialog" aria-modal="true" aria-labelledby={`household-${householdId}-title`} onClick={e => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border bg-card p-5 shadow-2xl sm:rounded-2xl">
          <div className="flex items-start justify-between gap-4 border-b pb-4">
            <div>
              <h2 id={`household-${householdId}-title`} className="text-lg font-bold">Household members</h2>
              <p className="text-xs text-muted-foreground">Only add a family member if this household membership has been confirmed.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="rounded bg-muted px-2 py-1 text-xs">{householdNumber || "No household code"}</code>
                <button
                  type="button"
                  disabled={!householdNumber}
                  onClick={() => void navigator.clipboard.writeText(householdNumber).then(() => setCopyMessage("Household code copied."), () => setCopyMessage("Could not copy code. Please copy it manually."))}
                  className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                >
                  Copy code
                </button>
              </div>
              {copyMessage && <p role="status" className="mt-1 text-xs text-muted-foreground">{copyMessage}</p>}
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="mt-4">
            <h3 className="text-sm font-semibold">Linked residents ({members.length})</h3>
            {members.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No residents linked yet.</p>
            ) : (
              <ul className="mt-2 divide-y rounded-xl border">
                {members.map(m => (
                  <li key={m.resident_id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span>
                      <strong>{m.first_name} {m.last_name}</strong>
                      {m.relationship && <span className="ml-2 text-xs text-muted-foreground">{m.relationship}</span>}
                    </span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => removeHouseholdMember(householdId, m.resident_id))}
                      title="Remove from household"
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5">
            <form
              onSubmit={event => { event.preventDefault(); if (residentId) run(() => addHouseholdMember(householdId, residentId)); }}
              className="space-y-2 rounded-xl border p-4"
            >
              <h3 className="text-sm font-semibold">Link existing resident</h3>
              <p className="text-xs text-muted-foreground">Search for a verified resident. Residents can only belong to one household.</p>
              <input
                aria-label="Search residents"
                type="search"
                placeholder="Search by first, middle, or last name"
                value={residentSearch}
                onChange={e => { setResidentSearch(e.target.value); setResidentId(""); }}
                className="w-full rounded-lg border p-2 text-sm"
              />
              <select
                aria-label="Search results: choose resident"
                value={residentId}
                onChange={e => setResidentId(e.target.value)}
                className="w-full rounded-lg border p-2 text-sm"
              >
                <option value="">{availableResidents.length ? "Select matching resident" : "No matching unlinked residents"}</option>
                {availableResidents.map(r => (
                  <option key={r.id} value={r.id}>{r.first_name} {r.middle_name ? `${r.middle_name} ` : ""}{r.last_name}</option>
                ))}
              </select>
              <button type="submit" disabled={!residentId || pending} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                {pending ? "Saving…" : "Link resident"}
              </button>
            </form>
          </div>
        </section>
      </div>,
      document.body
    )}
  </>;
}
