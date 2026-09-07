"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  BookOpen, Plus, Search, Eye, Pencil, Trash2, X, FileText,
  CalendarDays, Tag, ChevronDown, ShieldCheck, AlertTriangle,
  CheckCircle2, Clock, Upload, FileUp, Loader2, FileCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Policy {
  id: string;
  policy_number: string;
  title: string;
  category: PolicyCategory;
  description: string;
  effective_date?: string | null;
  expiry_date?: string | null;
  status: PolicyStatus;
  enacted_by: string;
  full_text: string;
  source_file?: string | null;
  created_at: string;
}

type PolicyCategory =
  | "Ordinance" | "Resolution" | "Executive Order"
  | "Health & Sanitation" | "Peace & Order" | "Environment"
  | "Social Services" | "Finance" | "Other";

type PolicyStatus = "Active" | "Repealed" | "Under Review" | "Draft";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: PolicyCategory[] = [
  "Ordinance","Resolution","Executive Order","Health & Sanitation",
  "Peace & Order","Environment","Social Services","Finance","Other",
];

const STATUS_CONFIG: Record<PolicyStatus, { label: string; className: string; icon: React.ReactNode }> = {
  Active:        { label: "Active",        className: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
  Repealed:      { label: "Repealed",      className: "bg-red-50 text-red-600 border border-red-200",            icon: <X className="h-3 w-3" /> },
  "Under Review":{ label: "Under Review",  className: "bg-amber-50 text-amber-700 border border-amber-200",      icon: <AlertTriangle className="h-3 w-3" /> },
  Draft:         { label: "Draft",         className: "bg-slate-100 text-slate-600 border border-slate-200",     icon: <Clock className="h-3 w-3" /> },
};

const CATEGORY_COLORS: Record<PolicyCategory, string> = {
  Ordinance:           "bg-blue-100 text-blue-700",
  Resolution:          "bg-violet-100 text-violet-700",
  "Executive Order":   "bg-orange-100 text-orange-700",
  "Health & Sanitation":"bg-pink-100 text-pink-700",
  "Peace & Order":     "bg-indigo-100 text-indigo-700",
  Environment:         "bg-green-100 text-green-700",
  "Social Services":   "bg-cyan-100 text-cyan-700",
  Finance:             "bg-yellow-100 text-yellow-700",
  Other:               "bg-gray-100 text-gray-600",
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockPolicies: Policy[] = [
  {
    id: "1", policy_number: "ORD-2026-001", title: "Anti-Littering Ordinance",
    category: "Environment", status: "Active", enacted_by: "Kagawad Maria Santos",
    effective_date: "2026-01-01", created_at: "2025-12-20",
    description: "Prohibits improper disposal of garbage and solid waste within the barangay premises.",
    full_text: "WHEREAS, cleanliness and proper sanitation are essential to the health and welfare of barangay residents...\n\nSection 1. Title - This ordinance shall be known as the Anti-Littering Ordinance of 2026.\nSection 2. Prohibited Acts - No person shall throw, dump, or deposit garbage in any public place.\nSection 3. Penalty - Fine of P500 first offense, P1,000 second offense.",
  },
  {
    id: "2", policy_number: "RES-2026-004", title: "Resolution on Barangay Curfew for Minors",
    category: "Peace & Order", status: "Active", enacted_by: "Hon. Pedro Reyes, Barangay Captain",
    effective_date: "2026-02-15", created_at: "2026-01-30",
    description: "Establishes a 10:00 PM curfew for minors aged 17 and below to ensure safety.",
    full_text: "RESOLVED, that the Sangguniang Barangay hereby enacts a curfew policy for all minors...\n\nSection 1. Curfew Hours: 10:00 PM to 5:00 AM.\nSection 2. Exceptions: Children accompanied by parents or going to/from school.",
  },
  {
    id: "3", policy_number: "ORD-2025-018", title: "No Smoking Policy in Public Areas",
    category: "Health & Sanitation", status: "Active", enacted_by: "Kagawad Ana Dela Cruz",
    effective_date: "2025-03-01", created_at: "2025-02-01",
    description: "Bans smoking in all public areas and within 10 meters of entrances to public buildings.",
    full_text: "WHEREAS, secondhand smoke poses significant health risks...\n\nSection 1. Smoking prohibited in all public parks, playgrounds, and waiting sheds.\nSection 2. Fine of P300 per violation.",
  },
  {
    id: "4", policy_number: "EO-2026-002", title: "Executive Order on Barangay Hall Operating Hours",
    category: "Executive Order", status: "Active", enacted_by: "Hon. Pedro Reyes, Barangay Captain",
    effective_date: "2026-03-01", created_at: "2026-02-20",
    description: "Sets official operating hours for the Barangay Hall and all associated offices.",
    full_text: "BY VIRTUE of the powers vested in me as Barangay Captain...\n\nSection 1. Operating Hours: Monday to Friday, 8:00 AM to 5:00 PM; Saturday, 8:00 AM to 12:00 NN.",
  },
  {
    id: "5", policy_number: "ORD-2024-009", title: "Anti-Noise Pollution Ordinance",
    category: "Peace & Order", status: "Repealed", enacted_by: "Kagawad Jose Ramos",
    effective_date: "2024-09-01", created_at: "2024-08-15",
    description: "Regulates noise levels to maintain peace and quiet, particularly during nighttime hours.",
    full_text: "WHEREAS, excessive noise affects the well-being of residents...\n\nSection 1. Noise Curfew: 10PM to 6AM.\nNOTE: Repealed and superseded by ORD-2025-022.",
  },
  {
    id: "6", policy_number: "RES-2026-007", title: "Resolution on Barangay Livelihood Assistance Fund",
    category: "Social Services", status: "Draft", enacted_by: "Kagawad Rosa Mendoza",
    effective_date: "2026-04-01", created_at: "2026-03-10",
    description: "Allocates funds for livelihood assistance programs targeting low-income residents.",
    full_text: "RESOLVED, to allocate funds from the Barangay Development Fund...\n\nSection 1. P200,000 for livelihood grants.\nSection 2. Priority: residents below poverty line, solo parents, PWDs.",
  },
];

// ─── Smart Extraction Helpers ─────────────────────────────────────────────────

function guessCategory(text: string): PolicyCategory {
  const t = text.toLowerCase();
  if (t.includes("ordinance")) return "Ordinance";
  if (t.includes("resolution")) return "Resolution";
  if (t.includes("executive order")) return "Executive Order";
  if (t.includes("health") || t.includes("sanitation") || t.includes("medical") || t.includes("smoking")) return "Health & Sanitation";
  if (t.includes("peace") || t.includes("order") || t.includes("curfew") || t.includes("crime") || t.includes("noise")) return "Peace & Order";
  if (t.includes("environment") || t.includes("waste") || t.includes("pollution") || t.includes("green") || t.includes("litter")) return "Environment";
  if (t.includes("social") || t.includes("livelihood") || t.includes("welfare") || t.includes("assistance") || t.includes("4ps")) return "Social Services";
  if (t.includes("finance") || t.includes("budget") || t.includes("fund") || t.includes("tax") || t.includes("revenue")) return "Finance";
  return "Other";
}

function guessTitle(text: string, filename: string): string {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 20)) {
    if (line.length > 10 && line.length < 160 && !/^whereas|^be it|^resolved|^section|^by virtue|^an act/i.test(line) && !/^\d+$/.test(line)) {
      return line.replace(/^[\W]+/, "").trim();
    }
  }
  return filename.replace(/\.(pdf|docx?)/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function guessPolicyNumber(text: string): string {
  const match = text.match(/(?:Ordinance|Resolution|Ord\.?|Res\.?|EO|E\.O\.)\s*(?:No\.?)?\s*([\d\-]+(?:-[A-Z]+)?)/i);
  if (match) return match[0].replace(/\s+/g, "-").toUpperCase().substring(0, 25);
  return "";
}

function guessEnactedBy(text: string): string {
  const patterns = [
    /(?:approved|enacted|signed|issued|enacted)\s+by[:\s]+([^\n.,]{5,80})/i,
    /(?:Hon\.|Honorable)\s+([^\n.,]{5,60})/i,
    /Barangay Captain[:\s]+([^\n.,]{3,60})/i,
    /(?:Kagawad|Secretary)\s+([^\n.,]{3,60})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].trim().substring(0, 80);
  }
  return "";
}

// ─── File Parser ──────────────────────────────────────────────────────────────

async function parseFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (ext === "pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(pageText);
    }
    return pages.join("\n\n");
  }

  if (ext === "docx" || ext === "doc") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  throw new Error("Unsupported file type. Please upload a PDF or Word (.docx) file.");
}

function buildPolicyData(text: string, filename: string): Partial<Policy> {
  const clean = text.replace(/\s{3,}/g, "\n").replace(/[ \t]+/g, " ").trim();
  return {
    title:          guessTitle(clean, filename),
    policy_number:  guessPolicyNumber(clean),
    category:       guessCategory(clean),
    enacted_by:     guessEnactedBy(clean),
    full_text:      clean,
    description:    clean.substring(0, 300).replace(/\n/g, " ").trim() + (clean.length > 300 ? "..." : ""),
    status:         "Draft",
    effective_date: "",
    source_file:    filename,
  };
}

// ─── Import Drop Zone ─────────────────────────────────────────────────────────

function ImportFileZone({ onParsed }: { onParsed: (data: Partial<Policy>) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [parsedFile, setParsedFile] = useState("");

  const process = useCallback(async (file: File) => {
    setError(""); setParsedFile(""); setParsing(true);
    try {
      const text = await parseFile(file);
      const data = buildPolicyData(text, file.name);
      setParsedFile(file.name);
      onParsed(data);
    } catch (e: any) {
      setError(e.message || "Failed to parse file.");
    } finally {
      setParsing(false);
    }
  }, [onParsed]);

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) process(files[0]);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => !parsing && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200
        ${dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-muted-foreground/25 bg-muted/20 hover:border-primary/50 hover:bg-primary/5"}`}
    >
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => handleFiles(e.target.files)} />

      {parsing ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-sm">Parsing document...</p>
            <p className="text-xs text-muted-foreground mt-0.5">Extracting policy text from your file</p>
          </div>
        </div>
      ) : parsedFile ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
            <FileCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-emerald-700">Parsed successfully!</p>
            <p className="text-xs text-muted-foreground mt-0.5">{parsedFile} — Fields pre-filled. Click to import another.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
            <FileUp className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-sm">Drop a PDF or Word file here</p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse your files</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold">PDF</span>
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">DOCX</span>
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">DOC</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewPolicyModal({ policy, onClose }: { policy: Policy; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground">{policy.policy_number || "No number assigned"}</p>
              <h2 className="text-lg font-bold leading-tight">{policy.title}</h2>
              {policy.source_file && (
                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Imported from: {policy.source_file}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={policy.status} />
            <CategoryBadge category={policy.category} />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enacted By</p>
              <p className="font-medium mt-1">{policy.enacted_by || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Effective Date</p>
              <p className="font-medium mt-1">{policy.effective_date ? new Date(policy.effective_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
            </div>
            {policy.expiry_date && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expiry Date</p>
                <p className="font-medium mt-1">{new Date(policy.expiry_date).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Created</p>
              <p className="font-medium mt-1">{new Date(policy.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Summary</p>
            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/40 rounded-xl p-3 border">{policy.description}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Policy Text</p>
            <pre className="text-xs text-foreground/80 leading-relaxed bg-muted/30 rounded-xl p-4 border whitespace-pre-wrap font-sans">{policy.full_text}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function PolicyFormModal({
  policy, onClose, onSave,
}: { policy?: Partial<Policy> | null; onClose: () => void; onSave: (data: Partial<Policy>) => void }) {
  const [form, setForm] = useState<Partial<Policy>>(
    policy ?? { policy_number: "", title: "", category: "Ordinance", description: "", effective_date: "", expiry_date: "", status: "Draft", enacted_by: "", full_text: "" }
  );
  const [tab, setTab] = useState<"manual" | "import">("manual");
  const isEdit = !!(policy as Policy)?.id;

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleParsed = (data: Partial<Policy>) => {
    setForm(prev => ({ ...prev, ...data }));
    setTab("manual");
  };

  const inp = "w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground";
  const lbl = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold">{isEdit ? "Edit Policy" : "Add New Policy"}</h2>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b shrink-0 px-6 gap-1">
          {[
            { key: "manual", label: "Manual Entry", icon: <FileText className="h-3.5 w-3.5" /> },
            { key: "import", label: "Import from File", icon: <Upload className="h-3.5 w-3.5" /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors
                ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === "import" ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 flex items-start gap-2">
                <FileUp className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Upload a <strong>PDF</strong> or <strong>Word (.docx)</strong> document containing the policy text.
                  The system will automatically extract the content and pre-fill the form fields.
                  You can review and edit everything before saving.
                </span>
              </div>
              <ImportFileZone onParsed={handleParsed} />
              {form.full_text && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
                  <FileCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Document parsed! Switch to <strong>Manual Entry</strong> to review and adjust the extracted fields before saving.</span>
                </div>
              )}
            </div>
          ) : (
            <>
              {form.source_file && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                  <FileCheck className="h-3.5 w-3.5 shrink-0" />
                  Pre-filled from: <strong>{form.source_file}</strong>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Policy Number</label>
                  <input name="policy_number" value={form.policy_number || ""} onChange={set} placeholder="e.g. ORD-2026-001" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <select name="status" value={form.status} onChange={set} className={inp}>
                    {(["Active","Draft","Under Review","Repealed"] as PolicyStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Policy Title</label>
                <input name="title" value={form.title || ""} onChange={set} placeholder="Enter policy title" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Category</label>
                  <select name="category" value={form.category} onChange={set} className={inp}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Enacted By</label>
                  <input name="enacted_by" value={form.enacted_by || ""} onChange={set} placeholder="Name / Position" className={inp} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Effective Date</label>
                  <input type="date" name="effective_date" value={form.effective_date || ""} onChange={set} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Expiry Date (optional)</label>
                  <input type="date" name="expiry_date" value={form.expiry_date || ""} onChange={set} className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Description / Summary</label>
                <textarea name="description" value={form.description || ""} onChange={set} rows={3} placeholder="Brief summary of the policy..." className={`${inp} resize-none`} />
              </div>
              <div>
                <label className={lbl}>Full Policy Text</label>
                <textarea name="full_text" value={form.full_text || ""} onChange={set} rows={8} placeholder="Full text of the ordinance or resolution..." className={`${inp} resize-none font-mono text-xs`} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold border hover:bg-muted transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all">
            {isEdit ? "Save Changes" : "Add Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PolicyStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.className}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: PolicyCategory }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${CATEGORY_COLORS[category]}`}>
      <Tag className="h-2.5 w-2.5" />{category}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"All" | PolicyCategory>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | PolicyStatus>("All");
  const [viewPolicy, setViewPolicy] = useState<Policy | null>(null);
  const [editPolicy, setEditPolicy] = useState<Policy | undefined>(undefined);
  const [addOpen, setAddOpen] = useState(false);
  const [addData, setAddData] = useState<Partial<Policy> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const quickImportRef = useRef<HTMLInputElement>(null);
  const [quickParsing, setQuickParsing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("policies").select("*").order("effective_date", { ascending: false });
      if (!mounted) return;
      if (error) setLoadError(error.message);
      setPolicies((data || []) as Policy[]);
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = policies.filter(p => {
    const s = search.toLowerCase();
    return (
      (!search || p.title.toLowerCase().includes(s) || p.policy_number.toLowerCase().includes(s) || p.enacted_by.toLowerCase().includes(s)) &&
      (catFilter === "All" || p.category === catFilter) &&
      (statusFilter === "All" || p.status === statusFilter)
    );
  });

  const stats = {
    total:  policies.length,
    active: policies.filter(p => p.status === "Active").length,
    draft:  policies.filter(p => p.status === "Draft").length,
    review: policies.filter(p => p.status === "Under Review").length,
  };

  const save = async (data: Partial<Policy>) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("Please sign in again."); return; }
    const payload = {
      policy_number: data.policy_number?.trim() || `POL-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
      title: data.title?.trim() || "Untitled policy",
      category: data.category || "Other",
      description: data.description?.trim() || "",
      effective_date: data.effective_date || null,
      expiry_date: data.expiry_date || null,
      status: data.status || "Draft",
      enacted_by: data.enacted_by?.trim() || "",
      full_text: data.full_text?.trim() || "",
      source_file: data.source_file || null,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    };
    const query = editPolicy
      ? supabase.from("policies").update(payload).eq("id", editPolicy.id)
      : supabase.from("policies").insert(payload).select("*").single();
    const { data: saved, error } = await query;
    if (error) { alert(`Unable to save policy: ${error.message}`); return; }
    if (editPolicy) {
      setPolicies(prev => prev.map(p => p.id === editPolicy.id ? { ...p, ...payload } : p));
      setEditPolicy(undefined);
    } else {
      setPolicies(prev => [saved as Policy, ...prev]);
      setAddOpen(false);
      setAddData(null);
    }
    await supabase.from("audit_logs").insert({ user_id: user.id, action: editPolicy ? "UPDATE_POLICY" : "CREATE_POLICY", module: "documents", details: { policy_number: payload.policy_number, status: payload.status } });
  };

  const handleQuickImport = async (files: FileList | null) => {
    if (!files?.length) return;
    setQuickParsing(true);
    try {
      const text = await parseFile(files[0]);
      setAddData(buildPolicyData(text, files[0].name));
      setAddOpen(true);
    } catch (e: any) {
      alert("Error: " + (e.message || "Unknown error"));
    } finally {
      setQuickParsing(false);
      if (quickImportRef.current) quickImportRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-start justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Barangay Policies</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Official ordinances, resolutions, and executive orders of the barangay.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={quickImportRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={e => handleQuickImport(e.target.files)} />
          <button
            onClick={() => quickImportRef.current?.click()}
            disabled={quickParsing}
            className="flex items-center gap-2 border bg-background font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-accent transition-all disabled:opacity-60"
          >
            {quickParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {quickParsing ? "Parsing..." : "Import File"}
          </button>
          <button
            onClick={() => { setAddData(null); setAddOpen(true); }}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md shadow-primary/25 hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" /> Add Policy
          </button>
        </div>
      </div>

      {loadError && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">Policy database is unavailable: {loadError}</div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Policies", value: stats.total,  Icon: BookOpen,      color: "text-blue-600",    bg: "bg-blue-50"   },
          { label: "Active",         value: stats.active, Icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50"},
          { label: "Draft",          value: stats.draft,  Icon: Clock,         color: "text-slate-500",   bg: "bg-slate-100" },
          { label: "Under Review",   value: stats.review, Icon: AlertTriangle, color: "text-amber-600",   bg: "bg-amber-50"  },
        ].map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="border rounded-xl p-4 bg-card shadow-sm flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-background w-72 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policies..." className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <div className="relative">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value as any)} className="appearance-none border rounded-xl px-3 py-2 text-sm bg-background pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="appearance-none border rounded-xl px-3 py-2 text-sm bg-background pr-8 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
            <option value="All">All Statuses</option>
            {(["Active","Draft","Under Review","Repealed"] as PolicyStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filtered.length}</span> of {policies.length} policies
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <BookOpen className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No policies found.</p>
            <p className="text-xs">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 border-b text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Policy No.</th>
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Enacted By</th>
                <th className="px-5 py-3">Effective Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(policy => (
                <tr key={policy.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-5 py-4">
                    <span className="font-mono text-xs font-bold text-primary">{policy.policy_number || "—"}</span>
                    {policy.source_file && (
                      <span className="block text-[9px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                        <FileText className="h-2.5 w-2.5" /> imported
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="font-semibold text-sm leading-snug line-clamp-2">{policy.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{policy.description}</p>
                  </td>
                  <td className="px-5 py-4"><CategoryBadge category={policy.category} /></td>
                  <td className="px-5 py-4"><StatusBadge status={policy.status} /></td>
                  <td className="px-5 py-4 text-sm text-muted-foreground">{policy.enacted_by || "—"}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {policy.effective_date ? new Date(policy.effective_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setViewPolicy(policy)} title="View" className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-muted-foreground transition-colors"><Eye className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditPolicy(policy)} title="Edit" className="h-8 w-8 rounded-lg hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center text-muted-foreground transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setDeleteTarget(policy.id)} title="Delete" className="h-8 w-8 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center justify-center text-muted-foreground transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {viewPolicy && <ViewPolicyModal policy={viewPolicy} onClose={() => setViewPolicy(null)} />}
      {editPolicy && <PolicyFormModal policy={editPolicy} onClose={() => setEditPolicy(undefined)} onSave={save} />}
      {addOpen && !editPolicy && (
        <PolicyFormModal
          policy={addData}
          onClose={() => { setAddOpen(false); setAddData(null); }}
          onSave={save}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete Policy</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-foreground/80">Are you sure you want to permanently delete this policy?</p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-lg text-sm font-semibold border hover:bg-muted transition-colors">Cancel</button>
              <button onClick={async () => { const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user || !deleteTarget) return; const { error } = await supabase.from("policies").delete().eq("id", deleteTarget); if (error) { alert(`Unable to delete policy: ${error.message}`); return; } await supabase.from("audit_logs").insert({ user_id: user.id, action: "DELETE_POLICY", module: "documents", details: { policy_id: deleteTarget } }); setPolicies(p => p.filter(x => x.id !== deleteTarget)); setDeleteTarget(null); }} className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
