"use client";

import { RecordIllustration } from "@/components/ui/RecordIllustration";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen, ClipboardCheck, FileText, Landmark, Plus, RefreshCw,
  ShieldCheck, Users, X, Link2, Trash2, AlertCircle
} from "lucide-react";
import {
  createCouncil, updateCouncil, fetchCouncilMembers, addCouncilMember, removeCouncilMember,
  fetchCouncilPrograms, fetchCouncilProgramOptions, linkCouncilProgram, unlinkCouncilProgram,
  type BarangayCouncil, type CouncilMember, type CouncilProgram, type CouncilProgramOption,
  type CouncilPosition,
} from "../actions";

type Permissions = { canCreate: boolean; canEdit: boolean; canDelete: boolean };
type CouncilDraft = {
  name: string; code: string; kind: "Council" | "Committee";
  mandate: string; mandate_reference: string; established_date: string;
  status: "Draft" | "Active" | "Inactive";
};

const blankDraft: CouncilDraft = {
  name: "", code: "", kind: "Council", mandate: "", mandate_reference: "",
  established_date: "", status: "Draft",
};
const POSITIONS: CouncilPosition[] = [
  "Chairperson", "Vice Chairperson", "Secretary", "Treasurer", "Member",
  "Sector Representative", "Organization Representative", "Coordinator",
];
const initialMember = {
  full_name: "",
  position: "Member" as CouncilPosition,
  appointment_reference: "",
  verification_status: "Pending" as "Pending" | "Verified",
  term_start: "",
  term_end: "",
};
const toDraft = (council: BarangayCouncil): CouncilDraft => ({
  name: council.name, code: council.code || "", kind: council.kind,
  mandate: council.mandate || "", mandate_reference: council.mandate_reference || "",
  established_date: council.established_date || "", status: council.status,
});

function StatusLabel({ status }: { status: string }) {
  const tone = status === "Active" || status === "Verified"
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : status === "Draft" || status === "Pending"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";
  return <span className={"rounded-full border px-2.5 py-1 text-xs font-bold " + tone}>{status}</span>;
}

export function CouncilsClient({ initialCouncils, loadError, permissions }: {
  initialCouncils: BarangayCouncil[];
  loadError: string | null;
  permissions: Permissions;
}) {
  const [councils, setCouncils] = useState(initialCouncils);
  const [selected, setSelected] = useState<BarangayCouncil | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<CouncilDraft>(blankDraft);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadMessage, setLoadMessage] = useState(loadError);
  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [programs, setPrograms] = useState<CouncilProgram[]>([]);
  const [programOptions, setProgramOptions] = useState<CouncilProgramOption[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [memberForm, setMemberForm] = useState(initialMember);
  const [addingMember, setAddingMember] = useState(false);
  const [chosenProgram, setChosenProgram] = useState("");
  const [search, setSearch] = useState("");
  const requestSerial = useRef(0);

  const loadDetails = useCallback(async (councilId: string) => {
    const serial = ++requestSerial.current;
    setDetailsLoading(true);
    setDetailsError(null);
    try {
      const [memberRows, linkedPrograms, availablePrograms] = await Promise.all([
        fetchCouncilMembers(councilId),
        fetchCouncilPrograms(councilId),
        fetchCouncilProgramOptions(),
      ]);
      if (serial !== requestSerial.current) return;
      setMembers(memberRows);
      setPrograms(linkedPrograms);
      setProgramOptions(availablePrograms);
      // Use fetched rows as the source of truth, not optimistic count guesses.
      setSelected(current => current?.id === councilId
        ? { ...current, member_count: memberRows.length, program_count: linkedPrograms.length }
        : current);
      setCouncils(previous => previous.map(council => council.id === councilId
        ? { ...council, member_count: memberRows.length, program_count: linkedPrograms.length }
        : council));
    } catch (error) {
      if (serial === requestSerial.current) setDetailsError(error instanceof Error ? error.message : "Unable to load the council roster.");
    } finally {
      if (serial === requestSerial.current) setDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    void loadDetails(selected.id);
    return () => { requestSerial.current++; };
  }, [selected?.id, reloadKey, loadDetails]);

  function selectCouncil(council: BarangayCouncil) {
    setSelected(council);
    setMembers([]);
    setPrograms([]);
    setEditing(false);
    setAddingMember(false);
    setMessage(null);
    setMemberForm(initialMember);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!permissions.canCreate) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await createCouncil(draft);
      setCouncils(previous => [...previous, { ...result, member_count: 0, program_count: 0 }]
        .sort((a, b) => a.name.localeCompare(b.name)));
      setCreating(false);
      setDraft(blankDraft);
      selectCouncil({ ...result, member_count: 0, program_count: 0 });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create council.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !permissions.canEdit) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await updateCouncil({ ...draft, id: selected.id });
      const updated = { ...result, member_count: selected.member_count, program_count: selected.program_count };
      setCouncils(previous => previous.map(c => c.id === selected.id ? updated : c));
      setSelected(updated);
      setEditing(false);
      setMessage("Council details saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update council.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !permissions.canCreate) return;
    setBusy(true);
    setMessage(null);
    try {
      const created = await addCouncilMember({ ...memberForm, council_id: selected.id });
      setMembers(previous => [created, ...previous]);
      const next = { ...selected, member_count: (selected.member_count ?? 0) + 1 };
      setSelected(next);
      setCouncils(previous => previous.map(c => c.id === next.id ? next : c));
      setMemberForm(initialMember);
      setAddingMember(false);
      setReloadKey(value => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add appointment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!permissions.canDelete || !selected) return;
    if (!window.confirm("Remove this council appointment from the roster?")) return;
    setBusy(true);
    setMessage(null);
    try {
      await removeCouncilMember(memberId);
      setMembers(previous => previous.filter(member => member.id !== memberId));
      const next = { ...selected, member_count: Math.max(0, (selected.member_count ?? 0) - 1) };
      setSelected(next);
      setCouncils(previous => previous.map(c => c.id === next.id ? next : c));
      setReloadKey(value => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove appointment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLinkProgram() {
    if (!selected || !chosenProgram || !permissions.canEdit) return;
    setBusy(true);
    setMessage(null);
    try {
      await linkCouncilProgram(selected.id, chosenProgram);
      setChosenProgram("");
      // An idempotent upsert may update an existing link; refetch the real count.
      setReloadKey(value => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to link program.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlinkProgram(programId: string) {
    if (!selected || !permissions.canEdit) return;
    setBusy(true);
    setMessage(null);
    try {
      await unlinkCouncilProgram(selected.id, programId);
      setPrograms(previous => previous.filter(p => p.program_id !== programId));
      const next = { ...selected, program_count: Math.max(0, (selected.program_count ?? 0) - 1) };
      setSelected(next);
      setCouncils(previous => previous.map(c => c.id === next.id ? next : c));
      setReloadKey(value => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to unlink program.");
    } finally {
      setBusy(false);
    }
  }

  const matches = councils.filter(c =>
    (c.name + " " + (c.code || "") + " " + c.kind).toLowerCase().includes(search.toLowerCase())
  );
  const availableToLink = programOptions.filter(p => !programs.some(x => x.program_id === p.id));

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Landmark className="h-6 w-6 text-blue-700" /> Councils & Committees
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Official council mandates, verified officer appointments and associated programs.
            Council members are separate from program beneficiaries.
          </p>
        </div>
        {permissions.canCreate && <button type="button" onClick={() => {
          setCreating(true); setSelected(null); setDraft(blankDraft); setMessage(null);
        }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white">
          <Plus className="h-4 w-4" /> New Council Draft
        </button>}
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p><strong>Verification first:</strong> This registry starts without generated leaders or councils.
            An official authority reference is required before a council can be Active,
            and an appointment/resolution reference is required to verify an officer.</p>
        </div>
      </div>

      {loadMessage && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <AlertCircle className="h-4 w-4" /> {loadMessage}
        <button className="ml-auto rounded-lg bg-red-100 px-3 py-2 font-semibold" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>}

      {!loadMessage && <>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Registered bodies", value: councils.length },
            { label: "Verified active councils", value: councils.filter(c => c.status === "Active").length },
            { label: "Pending review", value: councils.filter(c => c.status === "Draft").length },
          ].map(item => <div key={item.label} className="rounded-2xl border bg-white p-4">
            <p className="text-sm text-slate-600">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{item.value}</p>
          </div>)}
        </div>
        <label className="block max-w-md text-sm font-semibold text-slate-800">
          Search councils and committees
          <input type="search" value={search} onChange={event => setSearch(event.target.value)}
            placeholder="Search council name or code"
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        </label>
        {matches.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matches.map(council => <button key={council.id} type="button" onClick={() => selectCouncil(council)}
            className="rounded-2xl border bg-white p-5 text-left shadow-sm hover:border-blue-300 hover:shadow-md">
            <RecordIllustration kind="council" name={council.name} className="mb-3 h-28 w-full" />
            <div className="flex items-start justify-between gap-3">
              <Landmark className="h-5 w-5 text-blue-700" />
              <StatusLabel status={council.status} />
            </div>
            <h2 className="mt-4 text-base font-bold text-slate-900">{council.name}</h2>
            <p className="mt-1 text-xs text-slate-600">{council.kind}{council.code ? " · " + council.code : ""}</p>
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{council.mandate || "Mandate not supplied."}</p>
            <div className="mt-4 flex gap-4 text-xs text-slate-600">
              <span>{council.member_count ?? 0} roster entries</span>
              <span>{council.program_count ?? 0} linked programs</span>
            </div>
          </button>)}
        </div> : <div className="rounded-2xl border border-dashed bg-white p-7">
          <p className="font-semibold text-slate-900">{search ? "No matching bodies." : "No verified council records entered yet."}</p>
          <p className="mt-2 text-sm text-slate-600">
            No sample councils are inserted automatically. Only actual records returned by the database appear in this registry.
            Staff should verify a local ordinance, resolution or authority reference before activation.
          </p>
        </div>}
        
      </>}

      {creating && <div role="dialog" aria-modal="true" aria-labelledby="create-council-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form onSubmit={handleCreate} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 id="create-council-title" className="text-lg font-bold">New Council Draft</h2>
            <button type="button" onClick={() => setCreating(false)} aria-label="Close" className="rounded-lg p-2"><X /></button>
          </div>
          <p className="text-sm text-slate-600">Creating a draft does not certify that this body is officially constituted.</p>
          <CouncilFields draft={draft} setDraft={setDraft} includeStatus={false} />
          {message && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}
          <button type="submit" disabled={busy} className="min-h-11 w-full rounded-xl bg-blue-700 px-4 font-semibold text-white disabled:opacity-50">
            {busy ? "Saving..." : "Save Draft"}
          </button>
        </form>
      </div>}

      {selected && <div role="dialog" aria-modal="true" aria-labelledby="council-detail-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3">
        <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b bg-white p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="council-detail-title" className="text-lg font-bold">{selected.name}</h2>
                <StatusLabel status={selected.status} />
              </div>
              <p className="mt-1 text-xs text-slate-600">{selected.kind} · {selected.code || "No code assigned"}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close council details">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 space-y-5 overflow-y-auto p-5">
            <section className="space-y-2 rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-bold"><FileText className="h-4 w-4" /> Authority & mandate</h3>
                {permissions.canEdit && <button type="button" onClick={() => {
                  setDraft(toDraft(selected)); setEditing(x => !x); setMessage(null);
                }} className="rounded-lg border px-3 py-2 text-xs font-semibold">{editing ? "Cancel edit" : "Edit details"}</button>}
              </div>
              {editing ? <form onSubmit={handleUpdate} className="space-y-3">
                <CouncilFields draft={draft} setDraft={setDraft} includeStatus />
                <button disabled={busy} className="min-h-11 rounded-xl bg-blue-700 px-4 font-bold text-white disabled:opacity-50">Save changes</button>
              </form> : <>
                <p className="text-sm text-slate-700">{selected.mandate || "Mandate has not been entered."}</p>
                <p className="text-xs text-slate-600">Official reference: {selected.mandate_reference || "Not verified yet"}</p>
                <p className="text-xs text-slate-600">Established: {selected.established_date || "Not recorded"}</p>
              </>}
            </section>

            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-bold text-slate-900"><Users className="h-4 w-4" /> Council officers & members ({members.length})</h3>
                {permissions.canCreate && <button type="button" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800"
                  onClick={() => { setAddingMember(x => !x); setMemberForm(initialMember); }}>
                  {addingMember ? "Cancel" : "+ Add appointment"}
                </button>}
              </div>
              <p className="text-xs text-slate-600">Council appointments must be based on actual barangay records. A program enrollee is not automatically a council member.</p>
              {addingMember && <form onSubmit={handleAddMember} className="grid gap-3 rounded-xl border bg-slate-50 p-4 sm:grid-cols-2">
                <label className="text-xs font-semibold">Full name *
                  <input required maxLength={160} value={memberForm.full_name}
                    onChange={e => setMemberForm(x => ({ ...x, full_name: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold">Council position *
                  <select value={memberForm.position} onChange={e => setMemberForm(x => ({ ...x, position: e.target.value as CouncilPosition }))}
                    className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm">
                    {POSITIONS.map(position => <option key={position}>{position}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold">Verification
                  <select value={memberForm.verification_status}
                    onChange={e => setMemberForm(x => ({ ...x, verification_status: e.target.value as "Pending" | "Verified" }))}
                    className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm">
                    <option value="Pending">Pending verification</option>
                    <option value="Verified">Verified (source required)</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">Resolution/appointment reference
                  <input maxLength={1000} required={memberForm.verification_status === "Verified"}
                    value={memberForm.appointment_reference}
                    onChange={e => setMemberForm(x => ({ ...x, appointment_reference: e.target.value }))}
                    placeholder="Official resolution or appointment identifier"
                    className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold">Term start
                  <input type="date" value={memberForm.term_start}
                    onChange={e => setMemberForm(x => ({ ...x, term_start: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm" />
                </label>
                <label className="text-xs font-semibold">Term end
                  <input type="date" value={memberForm.term_end}
                    onChange={e => setMemberForm(x => ({ ...x, term_end: e.target.value }))}
                    className="mt-1 h-10 w-full rounded-lg border bg-white px-3 text-sm" />
                </label>
                <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-blue-700 px-4 font-bold text-white disabled:opacity-50 sm:col-span-2">
                  Save roster entry
                </button>
              </form>}
              {detailsLoading && <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm">Loading council details...</p>}
              {detailsError && <div role="alert" className="flex flex-wrap gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {detailsError}
                <button type="button" onClick={() => setReloadKey(x => x + 1)} className="font-bold underline">Retry</button>
              </div>}
              {!detailsLoading && !detailsError && (
                members.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-slate-600">No official council appointments recorded. Do not infer officers from program participant counts.</p> :
                <div className="space-y-2">
                  {members.map(member => <div key={member.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border p-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{member.full_name}</p>
                      <p className="mt-0.5 text-xs text-slate-700">{member.position}</p>
                      <p className="mt-1 text-xs text-slate-600">Source: {member.appointment_reference || "Awaiting evidence"}</p>
                      {(member.term_start || member.term_end) && <p className="text-xs text-slate-600">
                        Term: {member.term_start || "Unknown"} – {member.term_end || "Open"}
                      </p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusLabel status={member.verification_status} />
                      {permissions.canDelete && <button type="button" disabled={busy}
                        onClick={() => void handleRemoveMember(member.id)}
                        aria-label={"Remove " + member.full_name} className="rounded-lg p-2 text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>}
                    </div>
                  </div>)}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-xl border p-4">
              <h3 className="flex items-center gap-2 font-bold"><Link2 className="h-4 w-4" /> Associated programs ({programs.length})</h3>
              <p className="text-xs text-slate-600">Optional program ownership links, not membership or automatic enrollment.</p>
              {permissions.canEdit && <div className="flex flex-wrap gap-2">
                <label htmlFor="council-program-select" className="sr-only">Choose a program</label>
                <select id="council-program-select" value={chosenProgram}
                  onChange={event => setChosenProgram(event.target.value)}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm">
                  <option value="">Choose existing program</option>
                  {availableToLink.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}
                </select>
                <button disabled={busy || !chosenProgram || detailsLoading || !!detailsError}
                  onClick={() => void handleLinkProgram()} className="min-h-11 rounded-lg bg-blue-700 px-4 text-sm font-bold text-white disabled:opacity-40">
                  Link program
                </button>
              </div>}
              {!detailsLoading && !detailsError && !programs.length && <p className="text-sm text-slate-600">No programs linked yet.</p>}
              {programs.map(program => <div key={program.program_id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
                <span className="text-sm text-slate-800">{program.program_name}</span>
                {permissions.canEdit && <button type="button" disabled={busy}
                  onClick={() => void handleUnlinkProgram(program.program_id)}
                  className="text-xs font-bold text-red-700 underline">Unlink</button>}
              </div>)}
            </section>
            {message && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
          </div>
        </div>
      </div>}
    </div>
  );
}

function CouncilFields({ draft, setDraft, includeStatus }: {
  draft: CouncilDraft; setDraft: React.Dispatch<React.SetStateAction<CouncilDraft>>;
  includeStatus: boolean;
}) {
  return <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-xs font-semibold sm:col-span-2">Official council / committee name *
      <input required minLength={3} maxLength={160} value={draft.name}
        onChange={e => setDraft(x => ({ ...x, name: e.target.value }))}
        className="mt-1 min-h-11 w-full rounded-lg border px-3 text-sm" />
    </label>
    <label className="text-xs font-semibold">Type
      <select value={draft.kind} onChange={e => setDraft(x => ({ ...x, kind: e.target.value as CouncilDraft["kind"] }))}
        className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3 text-sm">
        <option>Council</option><option>Committee</option>
      </select>
    </label>
    <label className="text-xs font-semibold">Code (optional)
      <input value={draft.code} maxLength={32} onChange={e => setDraft(x => ({ ...x, code: e.target.value }))}
        className="mt-1 min-h-11 w-full rounded-lg border px-3 text-sm" />
    </label>
    <label className="text-xs font-semibold sm:col-span-2">Legal / administrative mandate
      <textarea value={draft.mandate} maxLength={3000}
        onChange={e => setDraft(x => ({ ...x, mandate: e.target.value }))}
        rows={2} className="mt-1 w-full rounded-lg border p-3 text-sm" />
    </label>
    <label className="text-xs font-semibold sm:col-span-2">Ordinance / resolution / authority reference
      <input value={draft.mandate_reference} maxLength={1000}
        placeholder="Official document number or source (required for Active)"
        onChange={e => setDraft(x => ({ ...x, mandate_reference: e.target.value }))}
        className="mt-1 min-h-11 w-full rounded-lg border px-3 text-sm" />
    </label>
    <label className="text-xs font-semibold">Date established
      <input type="date" value={draft.established_date} onChange={e => setDraft(x => ({ ...x, established_date: e.target.value }))}
        className="mt-1 min-h-11 w-full rounded-lg border px-3 text-sm" />
    </label>
    {includeStatus && <label className="text-xs font-semibold">Status
      <select value={draft.status} onChange={e => setDraft(x => ({ ...x, status: e.target.value as CouncilDraft["status"] }))}
        className="mt-1 min-h-11 w-full rounded-lg border bg-white px-3 text-sm">
        <option value="Draft">Draft / not verified</option>
        <option value="Active">Active (authority required)</option>
        <option value="Inactive">Inactive</option>
      </select>
    </label>}
  </div>;
}
