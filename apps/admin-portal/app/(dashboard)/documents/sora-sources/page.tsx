"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import {
  type OfficialSource, type DocumentService, type SourceInput,
  listSoraSourcesAndServices, saveSoraSource, setSoraSourcePublication, updateSoraDocumentService,
} from "./actions";

const inputStyle = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200";
const boxStyle = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";
const start: SourceInput = {
  title: "", source_url: "", authority: "national_law", jurisdiction_scope: "philippines",
  summary: "", keywords: [],
};

export default function SoraSourcesPage() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<"law" | "service">("law");
  const [sources, setSources] = useState<OfficialSource[]>([]);
  const [services, setServices] = useState<DocumentService[]>([]);
  const [form, setForm] = useState<SourceInput | null>(null);
  const [keywordText, setKeywordText] = useState("");
  const [checked, setChecked] = useState(false);
  const [editService, setEditService] = useState<DocumentService | null>(null);
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canCreate = hasPermission("documents", "canCreate");
  const canEdit = hasPermission("documents", "canEdit");
  const canApprove = hasPermission("documents", "canApprove");

  const reload = useCallback(async () => {
    try {
      const data = await listSoraSourcesAndServices();
      setSources(data.sources);
      setServices(data.services);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load sources."); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(done); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save changes."); }
    finally { setBusy(false); }
  }

  function openForm(source?: OfficialSource) {
    setForm(source ? {
      id: source.id, title: source.title, source_url: source.source_url,
      authority: source.authority, jurisdiction_scope: source.jurisdiction_scope,
      summary: source.summary, keywords: source.keywords,
    } : { ...start });
    setKeywordText(source?.keywords.join(", ") ?? "");
    setChecked(false); setError(""); setNotice("");
  }

  function openService(s: DocumentService) {
    setEditService(s);
    setDescription(s.description ?? "");
    setRequirements(Array.isArray(s.requirements_json)
      ? s.requirements_json.filter((x): x is string => typeof x === "string").join("\n") : "");
  }

  const visible = sources.filter(s =>
    !query.trim() || [s.title, s.summary, ...(Array.isArray(s.keywords) ? s.keywords : [])]
      .join(" ").toLowerCase().includes(query.toLowerCase()));

  return <div className="mx-auto max-w-6xl space-y-5">
    <header>
      <h1 className="text-2xl font-bold text-slate-900">Ate Sora Sources</h1>
      <p className="mt-1 text-sm text-slate-600">
        Manage official law references and live document-service requirements in Documents &amp; Services.
        Only approved Published sources may be cited by Ate Sora.
      </p>
    </header>
    <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      National laws, Butuan City codes, and barangay ordinances are different authorities. Never publish guessed fines,
      contact numbers, or schedules. For signed PDF or DOCX policies, <Link href="/documents/policies" className="font-bold underline">import the document as Draft under Policies</Link> and verify the original before activation.
      For text knowledge uploads, use the <Link href="/knowledge" className="font-bold underline">Knowledge Management</Link> page; unverified uploads remain private.
    </section>
    <div className="flex flex-wrap gap-2">
      <a href="/api/documents/sora-sources/pdf?kind=catalog" target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center rounded-xl bg-blue-700 px-4 text-sm font-bold text-white">
        View PDF knowledge &amp; services guide
      </a>
      <a href="/api/documents/sora-sources/pdf?kind=catalog&amp;download=1"
        className="inline-flex min-h-11 items-center rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700">
        Download PDF guide
      </a>
    </div>
    <nav className="flex flex-wrap gap-2" aria-label="Ate Sora source sections">
      <button onClick={() => setTab("law")} className={tab === "law" ? "min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white" : "min-h-11 rounded-xl border bg-white px-4 text-sm font-semibold"}>
        Official sources ({sources.filter(s => s.status === "Published").length} published)
      </button>
      <button onClick={() => setTab("service")} className={tab === "service" ? "min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white" : "min-h-11 rounded-xl border bg-white px-4 text-sm font-semibold"}>
        Document services ({services.length})
      </button>
    </nav>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    {tab === "law" && <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input aria-label="Search official sources" placeholder="Search laws and resident concerns" value={query}
          onChange={e => setQuery(e.target.value)} className={inputStyle + " max-w-md flex-1"}/>
        {canCreate && <button onClick={() => openForm()} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">Add official source</button>}
        <button onClick={() => void reload()} className="min-h-11 rounded-xl border bg-white px-4 text-sm">Refresh</button>
      </div>
      {form && <section className={boxStyle}>
        <h2 className="font-bold">{form.id ? "Edit official source" : "New official source"}</h2>
        <p className="mt-1 text-xs text-slate-600">Edits become Archived until re-approved. Publish is a separate approval action.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">Title
            <input value={form.title} onChange={e => setForm(v => v && ({...v,title:e.target.value}))} maxLength={180} className={inputStyle + " mt-1"} />
          </label>
          <label className="text-xs font-semibold">Official .gov.ph source URL
            <input type="url" value={form.source_url} onChange={e => setForm(v => v && ({...v,source_url:e.target.value}))} className={inputStyle + " mt-1"} />
          </label>
          <label className="text-xs font-semibold">Authority and jurisdiction
            <select className={inputStyle + " mt-1"} value={form.authority}
              onChange={e => {
                const authority = e.target.value as OfficialSource["authority"];
                const jurisdiction_scope = authority === "national_law" ? "philippines" : authority === "city_code_index" ? "butuan_city" : "tandang_sora_butuan";
                setForm(v => v && ({ ...v, authority, jurisdiction_scope }));
              }}>
              <option value="national_law">National law (Philippines)</option>
              <option value="city_code_index">Butuan City code/index</option>
              <option value="barangay_policy">Tandang Sora barangay policy</option>
            </select>
          </label>
          <label className="text-xs font-semibold">Search phrases, comma-separated
            <input value={keywordText} onChange={e => setKeywordText(e.target.value)} className={inputStyle + " mt-1"} placeholder="reklamo, away, mediation" />
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold">Verified summary and guidance for residents
          <textarea rows={6} value={form.summary} maxLength={3500}
            onChange={e => setForm(v => v && ({...v,summary:e.target.value}))}
            className={inputStyle + " mt-1"} />
        </label>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-1" />
          I reviewed the original source, its current status and jurisdiction, and checked this summary.
        </label>
        <div className="mt-4 flex gap-2">
          <button disabled={busy || !checked} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40"
            onClick={() => void run(async () => {
              await saveSoraSource({ ...form, keywords: keywordText.split(",").map(s => s.trim()).filter(Boolean) });
              setForm(null); setChecked(false);
            }, "Saved as Archived. An approver must Publish it before Ate Sora uses it.")}>Save for approval</button>
          <button className="min-h-11 rounded-xl border px-4 text-sm" onClick={() => setForm(null)}>Cancel</button>
        </div>
      </section>}
      {visible.map(s => <article key={s.id} className={boxStyle}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className={s.status === "Published" ? "rounded bg-green-100 px-2 py-1 text-xs font-bold text-green-800" : "rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700"}>{s.status}</span>
            <span className="ml-2 text-xs text-slate-500">{s.authority.replaceAll("_"," ")} · {s.jurisdiction_scope.replaceAll("_"," ")}</span>
            <h2 className="mt-3 font-bold">{s.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{s.summary}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <a href={`/api/documents/sora-sources/pdf?kind=source&id=${encodeURIComponent(s.id)}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-800">
                View PDF summary
              </a>
              <a href={s.source_url} target="_blank" rel="noopener noreferrer"
                className="inline-block break-all text-xs font-semibold text-blue-700 underline">Read original official source</a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && <button disabled={busy} onClick={() => openForm(s)} className="min-h-10 rounded-lg border px-3 text-xs font-bold">Edit</button>}
            {canApprove && <button disabled={busy} className="min-h-10 rounded-lg border px-3 text-xs font-bold"
              onClick={() => {
                const publish = s.status === "Archived";
                const okay = window.confirm(publish
                  ? "Have you checked the original official source and its current jurisdiction? Publish this source for Ate Sora?"
                  : "Archive this source so Ate Sora stops citing it?");
                if (okay) void run(() => setSoraSourcePublication(s.id, publish, publish), publish ? "Published for Ate Sora." : "Archived.");
              }}>{s.status === "Published" ? "Archive" : "Publish after review"}</button>}
          </div>
        </div>
      </article>)}
      {visible.length === 0 && <p className="text-sm text-slate-500">No matching official references. Only add sources that can be verified.</p>}
    </div>}
    {tab === "service" && <div className="space-y-3">
      <p className="text-sm text-slate-600">Ate Sora and the resident forms read these current requirements. Updating them may change actual applications, so enter only approved instructions.</p>
      {services.map(s => <article key={s.id} className={boxStyle}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold">{s.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{s.description || "No service description recorded."}</p>
            <div className="mt-2 space-y-1 text-sm text-slate-700">
              {Array.isArray(s.requirements_json) && s.requirements_json.length > 0
                ? s.requirements_json.map((v,i) => <p key={i}>• {String(v)}</p>)
                : <p>No verified requirements listed.</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <a href={`/api/documents/sora-sources/pdf?kind=service&id=${encodeURIComponent(s.id)}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-800">View PDF</a>
            {canEdit && <button disabled={busy} className="min-h-10 rounded-lg border px-3 text-xs font-bold" onClick={() => openService(s)}>Edit</button>}
          </div>
        </div>
        {editService?.id === s.id && <div className="mt-4 space-y-3 border-t pt-4">
          <label className="block text-xs font-semibold">Description
            <textarea rows={3} className={inputStyle + " mt-1"} value={description} onChange={e => setDescription(e.target.value)}/>
          </label>
          <label className="block text-xs font-semibold">Requirements (one per line)
            <textarea rows={6} className={inputStyle + " mt-1"} value={requirements} onChange={e => setRequirements(e.target.value)}/>
          </label>
          <div className="flex gap-2">
            <button disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white"
              onClick={() => void run(async () => {
                await updateSoraDocumentService(s.id, description, requirements.split("\n").map(x => x.trim()).filter(Boolean));
                setEditService(null);
              }, "Live document requirements updated.")}>Save service</button>
            <button className="min-h-11 rounded-xl border px-4 text-sm" onClick={() => setEditService(null)}>Cancel</button>
          </div>
        </div>}
      </article>)}
    </div>}
  </div>;
}
