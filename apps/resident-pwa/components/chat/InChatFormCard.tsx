"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, AlertCircle, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { submitDocumentRequest } from "@/app/(app)/requests/actions";
import { DOCUMENT_FORMS, isDocumentFormId } from "@/lib/ai/document-forms";

interface InChatFormCardProps {
  formType: string;
  title: string;
  sessionId?: string;
  formSchema?: unknown;
  onSubmitted?: (summary: { titles: string[]; totalFee: number; sessionId: string }) => void;
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
export function InChatFormCard({ formType, title }: InChatFormCardProps) {
  const supabase = useMemo(() => createClient(), []);
  const service = isDocumentFormId(formType) ? DOCUMENT_FORMS[formType] : null;
  const [catalog, setCatalog] = useState<CatalogDocument | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [purpose, setPurpose] = useState("");
  const [files, setFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const operationId = useRef<string | null>(null);
  const submissionInFlight = useRef(false);

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
    if (submissionInFlight.current || !catalog) return;
    const normalizedPurpose = purpose.trim();
    if (!normalizedPurpose) {
      setSubmitError("Please provide your purpose for requesting this document.");
      return;
    }
    for (const requirement of catalog.requirements_json) {
      if (!files[requirement]) {
        setSubmitError("Please attach the current required file: " + requirement);
        return;
      }
    }
    submissionInFlight.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = new FormData();
      payload.set("documentTypeId", catalog.id);
      payload.set("requirements", JSON.stringify(catalog.requirements_json));
      payload.set("purpose", normalizedPurpose);
      if (!operationId.current) operationId.current = crypto.randomUUID();
      payload.set("clientOperationId", operationId.current);
      for (const requirement of catalog.requirements_json) {
        payload.set("file_" + requirement, files[requirement]);
      }

      // Do not trust navigator.onLine: only the actual server response can
      // confirm a successful application submission.
      const result = await submitDocumentRequest(payload);
      if (!result?.success) throw new Error("Application was not confirmed by the server.");
      setSubmitted(true);
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
        <p className="text-amber-900">The current resident app requires an appointment and personal appearance for Business Clearance. An online application is not offered for this service.</p>
        {catalog?.requirements_json && catalog.requirements_json.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">Catalog requirements:</p>
            <ul className="list-disc pl-5">{catalog.requirements_json.map((req) => <li key={req}>{req}</li>)}</ul>
          </div>
        )}
        <p className="text-amber-900">Confirm requirements, any fees, and your schedule with barangay staff.</p>
        <Link href="/appointments/new" className="block rounded-xl bg-blue-700 px-4 py-3 text-center font-bold text-white">
          Book an Appointment
        </Link>
      </section>
    );
  }

  return (
    <section aria-label="Interactive Document Application Form"
      className="w-full rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-xs space-y-3">
      <div className="flex items-start gap-2">
        <FileText className="h-5 w-5 text-blue-700 shrink-0" />
        <div>
          <h3 className="font-bold text-blue-950">Ate Sora — {service?.title || title} Application</h3>
          <p className="text-blue-800">Fill out the form here in chat. Requests is only for tracking after submission.</p>
        </div>
      </div>
      {catalogLoading && <p role="status" className="flex gap-2 text-blue-800">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading current barangay requirements…
      </p>}
      {catalogError && (
        <div role="alert" className="rounded-xl bg-amber-50 border border-amber-300 p-3 space-y-2">
          <p className="text-amber-950">{catalogError} This does not necessarily mean your device is offline.</p>
          <button type="button" onClick={() => void refreshCatalog()}
            className="rounded-lg bg-blue-700 px-3 py-2 font-semibold text-white">Retry service catalog</button>
        </div>
      )}
      {catalog && (
        <form onSubmit={submit} className="space-y-3">
          {catalog.description && <p className="text-slate-700">{catalog.description}</p>}
          <label className="block space-y-1">
            <span className="font-bold text-slate-800">Purpose / Layunin *</span>
            <textarea required rows={2} maxLength={2000} value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900"
              placeholder="Why do you need this document?" />
          </label>
          <div className="space-y-2">
            <p className="font-bold text-slate-800">Required attachments (current barangay catalog)</p>
            {catalog.requirements_json.length === 0 && <p>No attachments are listed in the current catalog.</p>}
            {catalog.requirements_json.map((requirement) => (
              <label key={requirement} className="block rounded-lg border border-slate-200 bg-white p-2 space-y-1">
                <span className="block font-semibold text-slate-800">{requirement} *</span>
                <input type="file" required accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setFiles((previous) => {
                      const next = { ...previous };
                      if (file) next[requirement] = file;
                      else delete next[requirement];
                      return next;
                    });
                  }} className="block w-full text-xs text-slate-700" />
              </label>
            ))}
          </div>
          <p className="rounded-lg bg-amber-50 p-2 text-amber-900 border border-amber-200">
            Official fee and pickup date are not configured here. No payment is requested by this form;
            confirm the amount with barangay staff before paying.
          </p>
          {submitError && <p role="alert" className="rounded-lg bg-red-50 p-2 text-red-800">
            <AlertCircle className="inline h-3.5 w-3.5 mr-1" />{submitError}</p>}
          <button type="submit" disabled={submitting}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? "Submitting…" : "Submit Document Request"}
          </button>
        </form>
      )}
    </section>
  );
}
