"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, CheckCircle2, Loader2, FileText, Home, ClipboardList, Building2, Upload, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitDocumentRequest } from "../actions";
import { loadPublicSnapshot, savePublicSnapshot } from "@/lib/offline/public-snapshots";
import { saveDocumentDraft, loadDocumentDrafts, removeDocumentDraft, type DocumentDraft } from "@/lib/offline/document-drafts";
import { queueDocumentRequest } from "@/lib/offline/document-outbox";

// Map document names to icons for UI polish
const getIconForType = (name: string) => {
  if (name.includes("Clearance") && !name.includes("Business")) return FileText;
  if (name.includes("Residency")) return Home;
  if (name.includes("Indigency")) return ClipboardList;
  if (name.includes("Business")) return Building2;
  return FileText;
};

type DocumentType = {
  id: string;
  name: string;
  description: string;
  requirements_json: string[];
};

// Shortcuts identify a category, never a fee, eligibility rule, or official status.
function findShortcutDocument(types: DocumentType[], shortcut: string | null): DocumentType | undefined {
  const kind = shortcut?.toLowerCase();
  if (kind !== "clearance" && kind !== "indigency" && kind !== "business") return undefined;
  return types.find((type) => {
    const name = type.name.toLowerCase();
    if (kind === "clearance") return name.includes("clearance") && !name.includes("business");
    if (kind === "indigency") return name.includes("indigency");
    return name.includes("business");
  });
}

export default function NewRequestPage() {
  const router = useRouter();
  const supabase = createClient();

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<DocumentDraft[]>([]);
  const [draftMessage, setDraftMessage] = useState("");
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  
  const [purpose, setPurpose] = useState("");
  const [files, setFiles] = useState<Record<string, File>>({});
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const requestOperationId = useRef<string | null>(null);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    async function fetchDocTypes() {
      try {
        const { data, error } = await supabase
          .from("document_types")
          .select("*")
          .order("name");
        
        if (error) throw error;
        const types = (data || []) as DocumentType[];
        setDocumentTypes(types);
        const shortcut = new URLSearchParams(window.location.search).get("document");
        const matched = findShortcutDocument(types, shortcut);
        if (matched) setSelectedType(matched);
        try { await savePublicSnapshot("document-types", types, 24 * 60 * 60 * 1000); } catch { /* browser storage disabled */ }
      } catch (err: any) {
        console.error("Failed to fetch doc types", err);
        try {
          const cached = await loadPublicSnapshot<DocumentType[]>("document-types");
          if (cached) {
            setDocumentTypes(cached.data);
            const shortcut = new URLSearchParams(window.location.search).get("document");
            const matched = findShortcutDocument(cached.data, shortcut);
            if (matched) setSelectedType(matched);
          }
          else setErrorMsg("Document types unavailable offline. Open this page online first.");
        } catch { setErrorMsg("Document types unavailable offline."); }
      } finally {
        setFetching(false);
      }
    }
    fetchDocTypes();
  }, [supabase]);

  async function refreshDrafts() {
    try {
      const {data:{session}} = await supabase.auth.getSession();
      if (session?.user?.id) setSavedDrafts(await loadDocumentDrafts(session.user.id));
    } catch { setDraftMessage("Offline draft storage unavailable on this device."); }
  }
  useEffect(() => { void refreshDrafts(); }, []);

  async function saveDraft() {
    if (!selectedType) return;
    const {data:{session}} = await supabase.auth.getSession();
    if (!session?.user?.id) { setDraftMessage("Sign in to save an offline draft."); return; }
    try {
      await saveDocumentDraft({
        id: crypto.randomUUID(), userId: session.user.id,
        documentTypeId: selectedType.id, documentTypeName: selectedType.name,
        purpose, updatedAt: new Date().toISOString(),
      });
      setDraftMessage("Saved on this device — NOT submitted to the barangay. Attachments must be chosen again when online.");
      await refreshDrafts();
    } catch { setDraftMessage("Could not save draft. Check device storage."); }
  }

  const handleFileChange = (requirement: string, file: File | null) => {
    if (!file) {
      const newFiles = { ...files };
      delete newFiles[requirement];
      setFiles(newFiles);
      return;
    }
    
    // Client-side validation
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(`File for "${requirement}" exceeds 5MB limit.`);
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext || '')) {
      setErrorMsg(`Invalid file type for "${requirement}". Only PDF, JPG, and PNG are allowed.`);
      return;
    }
    
    setErrorMsg(null);
    setFiles((prev) => ({ ...prev, [requirement]: file }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;

    // Offline drafts do not persist attachments; allow queueing only attachment-free requests.
    const missing = selectedType.requirements_json?.filter(req => !files[req]);
    if (missing && missing.length > 0) {
      setErrorMsg(`Missing required attachments: ${missing.join(", ")}`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append("documentTypeId", selectedType.id);
      formData.append("purpose", purpose || `Requested ${selectedType.name}`);
      formData.append("requirements", JSON.stringify(selectedType.requirements_json || []));
      
      Object.entries(files).forEach(([req, file]) => {
        formData.append(`file_${req}`, file);
      });

      if (!requestOperationId.current) requestOperationId.current = crypto.randomUUID();
      formData.append("clientOperationId", requestOperationId.current);
      try {
        // An actual server receipt, not navigator.onLine, confirms submission.
        await submitDocumentRequest(formData);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const transportFailure = error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message);
        // Queue an attachment-free request only after a transport failure;
        // the same idempotency UUID prevents duplicates if the server received it.
        if (transportFailure && (selectedType.requirements_json || []).length === 0) {
          const {data:{session}} = await supabase.auth.getSession();
          if (!session?.user?.id) throw new Error("Sign in to save a queued request.");
          await queueDocumentRequest({
            id: requestOperationId.current, userId: session.user.id, documentTypeId: selectedType.id,
            purpose: purpose || `Requested ${selectedType.name}`,
            createdAt: Date.now(), attempts: 0, state: "queued",
          });
          setDraftMessage("Queued on this device — NOT submitted yet. It will sync after a verified connection returns.");
          return;
        }
        throw error;
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-6 text-center space-y-4 pt-12">
        <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-xl font-extrabold text-gray-900">Request Submitted!</h1>
        <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
          Your request for <strong className="text-gray-800">{selectedType?.name}</strong> has been sent to the Barangay Hall. Admin officials will review and process it.
        </p>
        <button
          onClick={() => router.push("/requests")}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-blue-700 transition-colors mt-4"
        >
          Track Request Status
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5 pb-20 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/requests" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Request Document</h1>
          <p className="text-sm text-gray-500">Choose a service, add details, then submit</p>
        </div>
      </div>

      <details className="rounded-xl border border-gray-200 bg-slate-50 p-3">
        <summary className="cursor-pointer py-1 text-sm font-semibold text-gray-800">
          Save for later / Offline drafts
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs leading-relaxed text-gray-600">
            Save a draft on this device if you cannot submit yet. Attachments are not stored. The barangay will not receive your request until submission succeeds.
          </p>
        <button type="button" onClick={()=>void saveDraft()} disabled={!selectedType} className="rounded-lg bg-blue-700 text-white px-3 py-2 text-xs font-bold disabled:opacity-40">Save draft on this device</button>
        {savedDrafts.map(d=><div key={d.id} className="rounded-lg bg-white p-2 text-xs flex items-center justify-between gap-2">
          <button type="button" onClick={()=>{
            const type=documentTypes.find(t=>t.id===d.documentTypeId);
            if(type){setSelectedType(type);setPurpose(d.purpose);setFiles({});setDraftMessage("Draft loaded. Reattach files before submission.");}
            else setDraftMessage("This document type is not currently available. Reconnect and refresh.");
          }} className="text-left underline">{d.documentTypeName} — {new Date(d.updatedAt).toLocaleString()}</button>
          <button type="button" onClick={()=>void removeDocumentDraft(d.id).then(refreshDrafts)} className="text-red-700">Delete</button>
        </div>)}
        </div>
      </details>
      {draftMessage && (
        <p role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {draftMessage}
        </p>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {errorMsg}
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
              Step 1: Choose a document
            </p>
            <div className="space-y-2">
              {documentTypes.map((docType) => {
                const Icon = getIconForType(docType.name);
                const isSelected = selectedType?.id === docType.id;
                const isBusinessClearance = docType.name.toLowerCase().includes("business");
                return (
                  <button
                    type="button"
                    key={docType.id}
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedType(docType);
                      setFiles({});
                    }}
                    className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/20 shadow-2xs"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">{docType.name}</p>
                      <p className="text-xs text-gray-600">{docType.description}</p>
                    </div>
                    {isBusinessClearance && (
                      <span className="flex-shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">In-Person Only</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedType && (
            <div className="space-y-5 animate-in fade-in duration-200 pt-4 border-t">

              {/* Business Clearance: in-person / booking only */}
              {selectedType.name.toLowerCase().includes("business") ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">In-Person Process Only</p>
                      <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                        Business Clearance requires a <strong>personal appearance and interview</strong> at the Barangay Hall. Online submission is not available for this document.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-blue-800 flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> What to do:
                    </p>
                    <ol className="text-[11px] text-blue-700 space-y-1 list-decimal list-inside leading-relaxed">
                      <li>Book an appointment at the Barangay Hall</li>
                      <li>Bring your DTI/SEC Registration & valid ID</li>
                      <li>Attend your scheduled interview in person</li>
                    </ol>
                  </div>
                  <Link
                    href="/appointments/new"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700 transition-colors"
                  >
                    <Calendar className="h-4 w-4" /> Book an Appointment
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Step 2: Purpose / Notes
                    </p>
                    <textarea
                      rows={3}
                      placeholder={`State the purpose for this ${selectedType.name}...`}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>

                  {selectedType.requirements_json && selectedType.requirements_json.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Step 3: Attach requirements
                      </p>
                      <p className="text-[10px] text-gray-500 mb-2">Maximum 5MB per file. Accepted formats: PDF, JPG, PNG.</p>
                      
                      {selectedType.requirements_json.map((req) => (
                        <div key={req} className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-800">{req}</span>
                            <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Required</span>
                          </div>
                          
                          <div className="relative">
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png"
                              onChange={(e) => handleFileChange(req, e.target.files?.[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              required
                            />
                            <div className={`flex items-center gap-2 p-2 rounded-lg border border-dashed transition-colors ${files[req] ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-300 hover:border-blue-400 bg-white'}`}>
                              <Upload className={`h-4 w-4 ${files[req] ? 'text-emerald-600' : 'text-gray-400'}`} />
                              <span className={`text-[11px] truncate flex-1 ${files[req] ? 'text-emerald-700 font-medium' : 'text-gray-500'}`}>
                                {files[req] ? files[req].name : "Tap to upload file..."}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-1">
                    <p className="text-sm font-bold text-gray-800">Review before submitting</p>
                    <p className="text-xs text-gray-700">Document: {selectedType.name}</p>
                    <p className="text-xs text-gray-700">Attached files: {Object.keys(files).length}</p>
                    <p className="text-xs text-gray-600">
                      {isOnline
                        ? "Submitting sends your request to the barangay for review."
                        : "You are offline. If this request needs attachments, save a draft and reconnect. Otherwise, it will be queued on this device, not sent yet."}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-12 py-3 mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {loading ? "Processing..." : isOnline ? "Submit Application" : "Queue on this device"}
                  </button>
                </>
              )}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
