"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, AlertCircle, Send, UploadCloud, ShieldCheck, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitDocumentRequest } from "@/app/(app)/requests/actions";
import { DOCUMENT_FORMS, isDocumentFormId } from "@/lib/ai/document-forms";
import { NAV_BADGES_CHANGED } from "@/lib/navigation/nav-badges";
import { isValidIdRequirement } from "@/lib/request-receipt";
import { hasRegistrationIdOnFile, isResidencyProofRequirement } from "@/lib/verified-resident-evidence";

interface InChatFormCardProps {
  formType: string;
  title: string;
  sessionId?: string;
  formSchema?: unknown;
  onSubmitted?: (reference: string) => void;
}

interface CatalogDocument {
  id: string;
  name: string;
  description: string | null;
  requirements_json: string[];
}

/**
 * One in-chat application per service. This intentionally reuses the same
 * authenticated, idempotent server action as the standard request form.
 * Avoid the old multi-insert client transaction: it could leave partial rows
 * after a failed file upload. Never use AI-proposed form schemas or fees.
 */
export function InChatFormCard({ formType, title, onSubmitted }: InChatFormCardProps) {
  const instanceId = useId();
  const supabase = useMemo(() => createClient(), []);
  const service = isDocumentFormId(formType) ? DOCUMENT_FORMS[formType] : null;
  const [catalog, setCatalog] = useState<CatalogDocument | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [purpose, setPurpose] = useState("");
  const [files, setFiles] = useState<Record<string, File>>({});
  const [savedIdType, setSavedIdType] = useState<string | null>(null);
  const [useSavedId, setUseSavedId] = useState(true);
  const [hasApprovedAddress, setHasApprovedAddress] = useState(false);
  const [useApprovedAddress, setUseApprovedAddress] = useState(true);
  const [receiptReference, setReceiptReference] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const operationId = useRef<string | null>(null);
  const submissionInFlight = useRef(false);
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("residents")
        .select("id,id_type,id_photo_url,verification_status")
        .eq("user_id", user.id).maybeSingle();
      if (mounted && !error && hasRegistrationIdOnFile(data)) setSavedIdType(data!.id_type);
      if (mounted && !error && data?.verification_status === "Verified") {
        const { data: address, error: addressError } = await supabase.from("addresses")
          .select("id").eq("resident_id", data.id).limit(1).maybeSingle();
        if (mounted && !addressError && address) setHasApprovedAddress(true);
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  async function refreshCatalog() {
    if (!service) {
      setCatalogError("This document type is not available in Ate Sora.");
      setCatalogLoading(false);
      return;
    }
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const { data, error } = await supabase
        .from("document_types")
        .select("id,name,description,requirements_json")
        .eq("name", service.title)
        .limit(2);

      if (error) throw error;
      if (!Array.isArray(data) || data.length !== 1) {
        throw new Error("This service has not been configured in the current barangay catalog.");
      }
      const item = data[0];
      if (!Array.isArray(item.requirements_json) ||
          item.requirements_json.length > 20 ||
          !item.requirements_json.every((req: unknown) =>
            typeof req === "string" && req.length > 0 && req.length <= 120)) {
        throw new Error("The barangay requirements for this service need administrator review.");
      }
      setCatalog(item as CatalogDocument);
    } catch (error) {
      setCatalog(null);
      setCatalogError(error instanceof Error ? error.message : "Could not load the current service catalog.");
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    void refreshCatalog();
    // The client is stable and the service is fixed for this chat message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, formType]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (submissionInFlight.current || !catalog) return;
    const normalizedPurpose = purpose.trim();
    if (!normalizedPurpose) {
      setSubmitError("Please provide your purpose for requesting this document.");
      return;
    }
    const reuseIdRequirements = catalog.requirements_json.filter(
      requirement => useSavedId && savedIdType && isValidIdRequirement(requirement)
    );
    const reuseProfileRequirements = catalog.requirements_json.filter(
      requirement => useApprovedAddress && hasApprovedAddress && isResidencyProofRequirement(requirement)
    );
    for (const requirement of catalog.requirements_json) {
      if (!files[requirement] && !reuseIdRequirements.includes(requirement) && !reuseProfileRequirements.includes(requirement)) {
        setSubmitError("Please attach the current required file: " + requirement);
        return;
      }
    }
    // The hosted Vercel function caps the complete multipart request at 4.5 MB.
    // Keep 0.5 MB headroom for multipart fields and server-action framing.
    const totalBytes = catalog.requirements_json.reduce((sum, requirement) =>
      sum + (reuseIdRequirements.includes(requirement) || reuseProfileRequirements.includes(requirement) ? 0 : files[requirement]?.size ?? 0), 0);
    if (totalBytes > 4_000_000) {
      setSubmitError("Combined attachments must be 4 MB or less for online submission. Compress images or PDFs and try again.");
      return;
    }
    submissionInFlight.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = new FormData();
      payload.set("documentTypeId", catalog.id);
      payload.set("requirements", JSON.stringify(catalog.requirements_json));
      payload.set("reuseVerifiedIdRequirements", JSON.stringify(reuseIdRequirements));
      payload.set("reuseProfileProofRequirements", JSON.stringify(reuseProfileRequirements));
      payload.set("purpose", normalizedPurpose);
      if (!operationId.current) operationId.current = crypto.randomUUID();
      payload.set("clientOperationId", operationId.current);
      for (const requirement of catalog.requirements_json) {
        if (!reuseIdRequirements.includes(requirement) && !reuseProfileRequirements.includes(requirement)) payload.set("file_" + requirement, files[requirement]);
      }

      // Do not trust navigator.onLine: only the actual server response can
      // confirm a successful application submission.
      const result = await submitDocumentRequest(payload);
      if (!result?.success || !result.reference) throw new Error("Application receipt was not confirmed by the server.");
      setReceiptReference(result.reference);
      setSubmitted(true);
      window.dispatchEvent(new Event(NAV_BADGES_CHANGED));
      onSubmitted?.(result.reference);
    } catch (error) {
      setSubmitError(
        (error instanceof Error ? error.message : "") ||
        "Submission could not be confirmed. Retry with the same form to avoid duplicates."
      );
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <section aria-label="Document application confirmation"
        className="w-full rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs space-y-3">
        <p className="flex items-center gap-2 font-bold text-emerald-900">
          <CheckCircle2 className="h-4 w-4" /> Request submitted successfully
        </p>
        <p className="text-emerald-900">{catalog?.name} has been sent for review. No payment amount or pickup date is confirmed here.</p>
        {receiptReference && <div className="rounded-xl bg-white p-3">
          <p className="text-xs font-bold text-slate-700">Automatically generated request reference (not a payment receipt)</p>
          <p className="mt-1 break-all font-mono font-bold text-blue-800">{receiptReference}</p>
          <button type="button" className="mt-2 rounded-lg border px-3 py-2 text-xs text-blue-800" onClick={() => navigator.clipboard?.writeText(receiptReference)}>Copy reference</button>
        </div>}
        <Link href="/requests" className="block rounded-xl bg-emerald-700 px-4 py-3 text-center font-semibold text-white">
          Track in My Requests
        </Link>
      </section>
    );
  }

  // Keep the existing app's in-person-only Business Clearance workflow.
  // Do not quietly turn it into an online application via AI chat.
  if (formType === "business") {
    return (
      <section aria-label="Business Clearance appointment guidance"
        className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs space-y-3">
        <h3 className="font-bold text-amber-950">Business Clearance — In-person process</h3>
        <p className="text-amber-900">The current resident app directs Business Clearance to an in-person process. Contact the barangay office to arrange a visit; this form cannot submit Business Clearance online.</p>
        {catalog?.requirements_json && catalog.requirements_json.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">Catalog requirements:</p>
            <ul className="list-disc pl-5">{catalog.requirements_json.map((req) => <li key={req}>{req}</li>)}</ul>
          </div>
        )}
        <p className="text-amber-900">Confirm requirements, any fees, and your schedule with barangay staff.</p>
        <Link href="/support" className="block rounded-xl bg-blue-700 px-4 py-3 text-center font-bold text-white">
          Contact barangay support
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Interactive Document Application Form"
      className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm">
      <div className="border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white px-3 py-3 sm:px-4">
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 rounded-xl bg-blue-600 p-2 text-white shadow-sm">
            <FileText className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Document application</p>
            <h3 className="mt-0.5 break-words text-base font-extrabold leading-snug text-slate-950">
              {service?.title || title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Fill out the form below. The barangay receives it only after you tap Submit.
            </p>
          </div>
        </div>
      </div>

      {/* Keep the form in Ate Sora's one chat scroll area, not a second modal or viewport. */}
      <div className="space-y-4 p-3 sm:p-4">
        {catalogLoading && <p role="status" className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading current service catalog...
        </p>}
        {catalogError && (
          <div role="alert" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-base leading-relaxed text-amber-950">{catalogError} Please try again here. If the service catalog is unavailable, no request has been submitted.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void refreshCatalog()}
                className="min-h-12 rounded-xl bg-blue-700 px-4 text-base font-bold text-white">Retry catalog</button>

            </div>
          </div>
        )}

        {catalog && (
          <form onSubmit={submit} className="space-y-5">
            {catalog.description && <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{catalog.description}</p>}
            <div>
              <label htmlFor={`chat-purpose-${instanceId}-${catalog.id}`} className="mb-2 block text-base font-bold text-slate-900">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-800">1</span>
                Purpose / Layunin <span className="text-red-600">*</span>
              </label>
              <textarea id={`chat-purpose-${instanceId}-${catalog.id}`} required rows={3} maxLength={2000}
                value={purpose} onChange={event => setPurpose(event.target.value)}
                className="block min-h-24 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-4 text-base leading-relaxed text-slate-900 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Why do you need this document?" />
              <p className="mt-1.5 text-right text-xs text-slate-500">{purpose.length}/2000 characters</p>
            </div>

            <fieldset>
              <legend className="mb-2 text-base font-bold text-slate-900">
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-800">2</span>
                Requirements and documents
              </legend>
              <p className="mb-3 text-sm leading-relaxed text-slate-600">
                Reuse an ID or your verified resident profile already on file, if available. Staff will review evidence. Additional uploads: PDF/JPG/PNG, 4 MB combined maximum.
              </p>
              {catalog.requirements_json.length === 0 && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">No attachments are listed for this document.</p>
              )}
              <div className="space-y-3">
                {catalog.requirements_json.map((requirement, index) => {
                  const file = files[requirement];
                  const inputId = `chat-attachment-${instanceId}-${catalog.id}-${index}`;
                  return (
                    <div key={requirement} className={`rounded-2xl border p-4 ${file ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"}`}>
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <label htmlFor={inputId} className="text-base font-bold text-slate-900">
                          {requirement} <span className="text-red-600" aria-label="required">*</span>
                        </label>
                        {file && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Added
                        </span>}
                      </div>
                      {savedIdType && isValidIdRequirement(requirement) && (
                        <div className="mb-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-base text-blue-900">
                          <label className="flex min-h-12 items-center gap-3 font-semibold">
                            <input type="radio" name={`id-choice-${inputId}`} checked={useSavedId} onChange={() => setUseSavedId(true)} />
                            Use my registered ID ({savedIdType}) — no new upload
                          </label>
                          <label className="flex min-h-12 items-center gap-3">
                            <input type="radio" name={`id-choice-${inputId}`} checked={!useSavedId} onChange={() => setUseSavedId(false)} />
                            Upload a different/current ID
                          </label>
                          <p>Staff will check your original registration ID without copying or exposing its photo. If it expired, upload an updated ID.</p>
                        </div>
                      )}
                      {hasApprovedAddress && isResidencyProofRequirement(requirement) && (
                        <fieldset className="mb-3 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <legend className="text-sm font-bold text-emerald-900">Verified resident profile found</legend>
                          <label className="flex min-h-12 items-center gap-3 text-base font-semibold text-emerald-950">
                            <input type="radio" name={`proof-choice-${inputId}`} checked={useApprovedAddress} onChange={() => setUseApprovedAddress(true)} />
                            Use my registered barangay address
                          </label>
                          <label className="flex min-h-12 items-center gap-3 text-base text-slate-900">
                            <input type="radio" name={`proof-choice-${inputId}`} checked={!useApprovedAddress} onChange={() => setUseApprovedAddress(false)} />
                            Upload additional proof of residency
                          </label>
                          <p className="text-sm text-emerald-900">This is not an issued certificate. Staff will check your address and can request more evidence.</p>
                        </fieldset>
                      )}
                      {!(savedIdType && useSavedId && isValidIdRequirement(requirement)) &&
                       !(hasApprovedAddress && useApprovedAddress && isResidencyProofRequirement(requirement)) && <label htmlFor={inputId}
                        className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-xl border border-dashed border-blue-300 bg-blue-50/60 p-3 transition-colors hover:bg-blue-100 focus-within:ring-2 focus-within:ring-blue-500">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700">
                          <UploadCloud className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-blue-800">{file ? "Change file" : "Tap to upload"}</span>
                          <span className="block break-all text-sm text-slate-600">{file ? file.name : "PDF, JPG or PNG · 4 MB combined"}</span>
                        </span>
                        <input id={inputId} type="file" required={!file} accept=".pdf,.jpg,.jpeg,.png"
                          className="sr-only"
                          onChange={event => {
                            const selected = event.target.files?.[0];
                            if (selected && (selected.size === 0 || selected.size > 4_000_000 ||
                                !["application/pdf", "image/jpeg", "image/png"].includes(selected.type))) {
                              setSubmitError("Choose a PDF, JPG or PNG file of up to 4 MB. Existing valid attachments are retained.");
                              event.target.value = "";
                              return;
                            }
                            setSubmitError("");
                            setFiles(previous => {
                              const next = { ...previous };
                              if (selected) next[requirement] = selected;
                              else delete next[requirement];
                              return next;
                            });
                          }} />
                      </label>}
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-amber-950">
                  <strong>Before you submit:</strong> Fees and pickup schedules are confirmed by barangay staff.
                  No payment is collected in this form.
                </p>
              </div>
            </div>
            {!isOnline && <p role="status" className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-700">
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              Your device appears offline. This chat form cannot save attachments offline.
              Use the full-page form to save a draft and submit when connected.
            </p>}
            {submitError && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{submitError}
            </p>}
            <button type="submit" disabled={submitting}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-700 px-4 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
              {submitting ? "Submitting request..." : "Submit Document Request"}
            </button>
            <p className="text-center text-xs text-slate-500">A confirmation will appear only when the barangay server accepts your request.</p>
          </form>
        )}
      </div>
    </section>
  );
}
