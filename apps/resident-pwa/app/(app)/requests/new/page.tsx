"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, FileText, Home, ClipboardList, Building2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const REQUEST_TYPES = [
  { value: "Barangay Clearance", label: "Barangay Clearance", icon: FileText, desc: "Official clearance for employment, ID, or travel." },
  { value: "Certificate of Residency", label: "Certificate of Residency", icon: Home, desc: "Proof of residency for official transactions." },
  { value: "Certificate of Indigency", label: "Certificate of Indigency", icon: ClipboardList, desc: "Assistance certificate for medical/financial aid." },
  { value: "Business Clearance", label: "Business Clearance", icon: Building2, desc: "Barangay permit for commercial operation." },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Resolve the public residents row. document_requests.resident_id is
      // intentionally not the auth user id.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in before submitting a request.");
      const { data: resident } = await supabase
        .from("residents")
        .select("id, verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!resident || resident.verification_status !== "Verified") {
        throw new Error("Your resident account must be verified before submitting a request.");
      }

      // 2. Ensure document_type exists or fetch id
      let { data: docType } = await supabase
        .from("document_types")
        .select("id")
        .eq("name", selectedType)
        .single();

      if (!docType) {
        const { data: newDocType } = await supabase
          .from("document_types")
          .insert({ name: selectedType, description: selectedType })
          .select("id")
          .single();
        docType = newDocType;
      }

      // 3. Insert document request into DB
      const { error: reqError } = await supabase
        .from("document_requests")
        .insert({
          resident_id: resident.id,
          document_type_id: docType?.id || null,
          status: "Pending",
          remarks: purpose || `Requested ${selectedType}`,
          requested_date: new Date().toISOString(),
        });

      if (reqError) throw new Error(reqError.message);

      await supabase.from("transactions").insert({
        user_id: user.id,
        module: "Documents",
        action: "Create Request",
        description: `Submitted ${selectedType} request.`,
      });

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
          Your request for <strong className="text-gray-800">{selectedType}</strong> has been sent to the Barangay Hall. Admin officials will review and process it.
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
    <div className="p-4 space-y-5 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/requests" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Request Document</h1>
          <p className="text-xs text-gray-500">Submit an online document application</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* Select Request Type */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
            1. Select Document Type
          </p>
          <div className="space-y-2">
            {REQUEST_TYPES.map(({ value, label, icon: Icon, desc }) => {
              const isSelected = selectedType === value;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setSelectedType(value)}
                  className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/20 shadow-2xs"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{label}</p>
                    <p className="text-[11px] text-gray-500">{desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedType && (
          <div className="space-y-3 animate-in fade-in duration-200 pt-2 border-t">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              2. Purpose / Notes
            </p>
            <textarea
              rows={3}
              placeholder="State the purpose for this document request (e.g. Employment, School Enrollment, Bank Requirement)..."
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Document Application
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
