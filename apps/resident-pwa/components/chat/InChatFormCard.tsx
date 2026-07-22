"use client";

import { useState } from "react";
import { FileText, CheckCircle2, Loader2, Sparkles, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface InChatFormCardProps {
  formType: string;
  title: string;
  onSubmitted?: () => void;
}

export function InChatFormCard({ formType, title, onSubmitted }: InChatFormCardProps) {
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Find or create document_type id
      let { data: docType } = await supabase
        .from("document_types")
        .select("id")
        .eq("name", title)
        .maybeSingle();

      if (!docType) {
        const { data: newDocType } = await supabase
          .from("document_types")
          .insert({ name: title, description: title })
          .select("id")
          .single();
        docType = newDocType;
      }

      // Submit document request
      const { error } = await supabase.from("document_requests").insert({
        resident_id: user?.id || null,
        document_type_id: docType?.id || null,
        status: "Pending",
        remarks: purpose || `Requested via AI Chat: ${title}`,
        requested_date: new Date().toISOString(),
      });

      if (error) throw new Error(error.message);

      setSubmitted(true);
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit form.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="my-2 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2 animate-in fade-in">
        <div className="flex items-center gap-2 text-emerald-800 font-bold">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>Application Submitted Successfully!</span>
        </div>
        <p className="text-emerald-700 text-[11px] leading-relaxed">
          Your request for <strong>{title}</strong> has been sent to the Barangay Hall. You can track its status under the Requests tab.
        </p>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl shadow-sm text-xs space-y-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-blue-900 font-bold">
        <div className="h-7 w-7 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-xs">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <span className="block text-xs">{title} Application Form</span>
          <span className="text-[10px] text-blue-600 font-medium">Interactive AI Assistance</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2 bg-red-100 border border-red-200 text-red-700 text-[11px] rounded-lg">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-bold text-gray-700 mb-1 uppercase tracking-wider">
            Purpose / Additional Notes
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Employment, Bank Requirement, School Enrollment..."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !purpose}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting Request...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Submit {title} Application
            </>
          )}
        </button>
      </form>
    </div>
  );
}
