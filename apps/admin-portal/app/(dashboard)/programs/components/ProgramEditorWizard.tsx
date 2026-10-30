"use client";

import { useRef, useState } from "react";
import { ImagePlus, Plus, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createProgram, editProgram, type BarangayProgram } from "../actions";

function toLocalInput(value?: string | null) {
  return value ? new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16) : "";
}

function toManilaIso(value: string) {
  return value ? new Date(`${value}:00+08:00`).toISOString() : null;
}

type ProgramDraft = {
  name: string; code: string; description: string; image_url: string | null; category: string;
  chairperson: string; contact: string; established_date: string; status: "Active" | "Inactive";
  is_custom: boolean; purok: string; venue: string; schedule_details: string; requirements: string;
  registration_deadline: string; registration_opens_at: string; event_start_at: string;
  min_age: number; max_age: number; registration_open: boolean;
};

export function ProgramEditorWizard({ onClose, onSaved, editing }: {
  onClose: () => void; onSaved: (program: BarangayProgram) => void; editing?: BarangayProgram | null;
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProgramDraft>({
    name: editing?.name || "", code: editing?.code || "", description: editing?.description || "",
    image_url: editing?.image_url || null, category: editing?.category || "Social Services",
    chairperson: editing?.chairperson || "", contact: editing?.contact || "",
    established_date: editing?.established_date || "", status: editing ? (editing.status === "Active" ? "Active" : "Inactive") : "Active",
    is_custom: editing?.is_custom ?? true, purok: editing?.purok || "All Puroks",
    venue: editing?.venue || "", schedule_details: editing?.schedule_details || "",
    requirements: editing?.requirements || "", registration_deadline: toLocalInput(editing?.registration_deadline),
    registration_opens_at: toLocalInput(editing?.registration_opens_at), event_start_at: toLocalInput(editing?.event_start_at),
    min_age: editing?.min_age ?? 0, max_age: editing?.max_age ?? 0,
    registration_open: editing?.registration_open ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedImageName, setSelectedImageName] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const inputClass = "mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

  async function uploadImage(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setSelectedImageName("");
      setError("Use JPG, PNG or WebP, up to 5 MB."); return;
    }
    setSelectedImageName(file.name);
    setSaving(true); setError("");
    try {
      const supabase = createClient();
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("program-images").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      setForm(prev => ({ ...prev, image_url: supabase.storage.from("program-images").getPublicUrl(path).data.publicUrl }));
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Image upload failed."); }
    finally { setSaving(false); }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1) {
      if (!form.name.trim()) { setError("Program name is required."); return; }
      if (!editing && !form.description.trim()) { setError("Add the program introduction before continuing."); return; }
      setError(""); setStep(2); return;
    }
    if (form.registration_opens_at && form.registration_deadline && new Date(form.registration_opens_at) >= new Date(form.registration_deadline)) {
      setError("Registration must open before its deadline."); return;
    }
    setSaving(true); setError("");
    const payload = {
      ...form,
      registration_deadline: toManilaIso(form.registration_deadline),
      registration_opens_at: toManilaIso(form.registration_opens_at),
      event_start_at: toManilaIso(form.event_start_at),
      min_age: form.min_age || null,
      max_age: form.max_age || null,
      is_public: form.status === "Active",
      registration_open: form.status === "Active" && form.registration_open,
    };
    try {
      let programId: string;
      if (editing) { await editProgram(editing.id, payload); programId = editing.id; }
      else { const result = await createProgram(payload as any); programId = result.id; }
      onSaved({ ...editing, ...payload, id: programId, created_at: editing?.created_at || new Date().toISOString(), enrollee_count: editing?.enrollee_count || 0 } as BarangayProgram);
      onClose();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to save the program."); }
    finally { setSaving(false); }
  }

  const input = (key: "name" | "code" | "purok" | "venue" | "schedule_details" | "chairperson" | "contact", placeholder = "") => <input value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} className={inputClass} />;
  const area = (key: "description" | "requirements", placeholder: string, rows: number) => <textarea value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} rows={rows} className={`${inputClass} resize-y`} />;
  const field = (label: string, control: React.ReactNode, wide = false) => <label className={`block text-xs font-semibold ${wide ? "sm:col-span-2" : ""}`}>{label}{control}</label>;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4">
    <section className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
      <header className="flex items-center justify-between border-b px-5 py-4 sm:px-6"><div><h2 className="flex items-center gap-2 font-bold"><Plus className="h-4 w-4 text-primary" />{editing ? "Edit Program" : "Create New Program"}</h2><p className="mt-1 text-xs text-muted-foreground">Step {step} of 2 · {step === 1 ? "Introduction and cover" : "Details and status"}</p></div><button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-muted"><X className="h-5 w-5" /></button></header>
      <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-6">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {step === 1 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field("Program Name *", input("name", "e.g. Youth Leadership Council"))}</div>
            {field("Code / Acronym", input("code", "e.g. YLC"))}
            {field("Category", <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className={inputClass}><option>Social Services</option><option>Peace & Order</option><option>Youth Development</option><option>Health & Wellness</option><option>Education</option><option>Anti-Drug</option><option>Women & Children</option><option>Senior Citizens</option><option>Livelihood</option><option>Environmental</option><option>Other</option></select>)}
            <div className="sm:col-span-2">{field("Welcome / Program Introduction *", area("description", "Welcome! Explain what the program does, whom it supports, what residents can expect, and how they can join.", 5))}<p className="mt-1 text-[11px] text-muted-foreground">Residents see this introduction before deciding to join.</p></div>
            <div className="sm:col-span-2"><p className="text-xs font-semibold">Program Cover Image (JPG, PNG, WebP; max 5 MB)</p>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} aria-label="Choose a program cover image" onChange={e => { const file = e.target.files?.[0]; if (file) void uploadImage(file); e.currentTarget.value = ""; }} className="sr-only" />
              <div className="mt-1 flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ImagePlus className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{selectedImageName || (form.image_url ? "Cover image ready" : "Add a cover image")}</p>
                    <p className="mt-0.5 text-xs font-normal text-muted-foreground">JPG, PNG or WebP · up to 5 MB</p>
                  </div>
                </div>
                <button type="button" disabled={saving} onClick={() => imageInputRef.current?.click()} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60">
                  <Upload className="h-4 w-4 text-primary" />{saving ? "Uploading…" : "Choose file"}
                </button>
              </div>
              <p className="mt-2 text-[11px] font-normal text-muted-foreground">A clear landscape image helps residents recognize the program in the PWA.</p>
              {form.image_url && <div className="mt-3 overflow-hidden rounded-2xl border bg-slate-100">
                <div className="flex aspect-[16/7] max-h-64 items-center justify-center bg-slate-900/5"><img src={form.image_url} alt="Program cover preview" className="h-full w-full object-contain" /></div>
                <div className="flex items-center justify-between border-t bg-background px-3 py-2"><span className="text-xs font-medium text-muted-foreground">Cover preview</span><button type="button" onClick={() => { setForm(prev => ({ ...prev, image_url: null })); setSelectedImageName(""); }} className="text-xs font-semibold text-red-600 hover:text-red-700">Remove image</button></div>
              </div>}
            </div>
          </div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field("Purok / Area", input("purok", "All Puroks"))}{field("Venue", input("venue"))}
            <div className="sm:col-span-2">{field("Schedule / When to attend", input("schedule_details", "e.g. Every Saturday, 8:00 AM"))}</div>
            <div className="sm:col-span-2">{field("Requirements / Eligibility", area("requirements", "Who can join and what to prepare", 3))}</div>
            {field("Program Start (optional)", <input type="datetime-local" value={form.event_start_at} onChange={e => setForm(prev => ({ ...prev, event_start_at: e.target.value }))} className={inputClass} />)}
            {field("Registration Opens (optional)", <input type="datetime-local" value={form.registration_opens_at} onChange={e => setForm(prev => ({ ...prev, registration_opens_at: e.target.value }))} className={inputClass} />)}
            {field("Registration Deadline (optional)", <input type="datetime-local" value={form.registration_deadline} onChange={e => setForm(prev => ({ ...prev, registration_deadline: e.target.value }))} className={inputClass} />)}
            {field("Minimum Age (0 = any)", <input type="number" min="0" value={form.min_age} onChange={e => setForm(prev => ({ ...prev, min_age: Number(e.target.value) }))} className={inputClass} />)}
            {field("Maximum Age (0 = any)", <input type="number" min="0" value={form.max_age} onChange={e => setForm(prev => ({ ...prev, max_age: Number(e.target.value) }))} className={inputClass} />)}
            {field("Chairperson / Contact Person", input("chairperson"))}{field("Contact Number", input("contact", "09XXXXXXXXX"))}
            {field("Established Date", <input type="date" value={form.established_date} onChange={e => setForm(prev => ({ ...prev, established_date: e.target.value }))} className={inputClass} />)}
            {field("Program Status", <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as ProgramDraft["status"], registration_open: e.target.value === "Active" ? prev.registration_open : false }))} className={inputClass}><option value="Active">Active — visible in PWA</option><option value="Inactive">Inactive — hidden from PWA</option></select>)}
            {form.status === "Active" && <label className="flex items-center gap-2 rounded-xl border p-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.registration_open} onChange={e => setForm(prev => ({ ...prev, registration_open: e.target.checked }))} className="h-4 w-4" />Accept PWA applications</label>}
            <p className="text-xs text-muted-foreground sm:col-span-2">Active programs appear in the PWA automatically. Inactive programs are hidden. Applications have no slot limit.</p>
          </div>}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t px-5 py-4 sm:px-6"><button type="button" onClick={() => step === 2 ? (setStep(1), setError("")) : onClose()} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-muted">{step === 2 ? "Back" : "Cancel"}</button><button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving…" : step === 1 ? "Next" : editing ? "Save Changes" : "Create Program"}</button></footer>
      </form>
    </section>
  </div>;
}
