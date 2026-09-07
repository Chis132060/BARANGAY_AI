"use client";

import { useEffect, useState } from "react";
import {
  FileText, CheckCircle2, Loader2, Sparkles, Send, Plus, Trash2,
  Building2, Home, ClipboardList, ShieldCheck, DollarSign, Info
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

interface InChatFormCardProps {
  formType: string;
  title: string;
  sessionId?: string;
  formSchema?: {
    fields?: Array<{
      name: string;
      type?: "string" | "number" | "select" | "date" | "boolean" | "file";
      label?: string;
      required?: boolean;
      options?: string[];
      placeholder?: string;
      accept?: string;
    }>;
  };
  onSubmitted?: (summary: { titles: string[]; totalFee: number; sessionId: string }) => void;
}

interface DocItem {
  id: string;
  type: string;
  title: string;
  fee: number;
  purpose: string;
  // Specific fields
  idType?: string;
  incomeBracket?: string;
  dependentsCount?: string;
  yearsResiding?: string;
  purokAddress?: string;
  businessName?: string;
  businessNature?: string;
  assistanceType?: string;
  registrationType?: string;
  ownerContactNumber?: string;
  dtiSecRegistrationNo?: string;
  tin?: string;
  establishmentType?: string;
  capitalization?: string;
  grossSalesPreviousYear?: string;
  businessAddress?: string;
  customFields: Record<string, string>;
  attachments: File[];
}

const AVAILABLE_DOCS: { type: string; title: string; fee: number; icon: any }[] = [
  { type: "clearance", title: "Barangay Clearance", fee: 50, icon: FileText },
  { type: "indigency", title: "Certificate of Indigency", fee: 0, icon: ClipboardList },
  { type: "residency", title: "Certificate of Residency", fee: 30, icon: Home },
  { type: "business", title: "Business Clearance", fee: 500, icon: Building2 },
];

export function InChatFormCard({ formType, title, sessionId: initialSessionId, formSchema, onSubmitted }: InChatFormCardProps) {
  const [docList, setDocList] = useState<DocItem[]>(() => [
    {
      id: uuidv4(),
      type: formType || "clearance",
      title: title || "Barangay Clearance",
      fee: formType === "indigency" ? 0 : formType === "residency" ? 30 : formType === "business" ? 500 : 50,
      purpose: "",
      idType: "PhilID / National ID",
      incomeBracket: "Below ₱10,000",
      dependentsCount: "1",
      yearsResiding: "5 years",
      purokAddress: "Purok 1",
      businessName: "",
      businessNature: "Retail / Sari-Sari Store",
      assistanceType: "Medical / Hospitalization",
      registrationType: "New",
      ownerContactNumber: "",
      dtiSecRegistrationNo: "",
      tin: "",
      establishmentType: "Sari-sari store",
      capitalization: "",
      grossSalesPreviousYear: "",
      businessAddress: "",
      customFields: {},
      attachments: [],
    },
  ]);

  const [contactNumber, setContactNumber] = useState("");
  const [residentId, setResidentId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedSummary, setSubmittedSummary] = useState<{ titles: string[]; totalFee: number; batchId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  // Load resident profile contact if available
  useEffect(() => {
    async function loadResident() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: resident } = await supabase
          .from("residents")
          .select("id, verification_status, contact_number, addresses(purok, street)")
          .eq("user_id", user.id)
          .maybeSingle();

        if (resident?.verification_status === "Verified") {
          setResidentId(resident.id);
        }
        if (resident?.contact_number) {
          setContactNumber(resident.contact_number);
        }
      }
    }
    loadResident();
  }, [supabase]);

  const addDocument = (docConfig: { type: string; title: string; fee: number }) => {
    // Avoid exact duplicate in same session
    if (docList.some((d) => d.type === docConfig.type)) return;

    setDocList((prev) => [
      ...prev,
      {
        id: uuidv4(),
        type: docConfig.type,
        title: docConfig.title,
        fee: docConfig.fee,
        purpose: "",
        idType: "PhilID / National ID",
        incomeBracket: "Below ₱10,000",
        dependentsCount: "1",
        yearsResiding: "5 years",
        purokAddress: "Purok 1",
        businessName: "",
        businessNature: "Retail / Sari-Sari Store",
        assistanceType: "Medical / Hospitalization",
        registrationType: "New",
        ownerContactNumber: "",
        dtiSecRegistrationNo: "",
        tin: "",
        establishmentType: "Sari-sari store",
        capitalization: "",
        grossSalesPreviousYear: "",
        businessAddress: "",
        customFields: {},
        attachments: [],
      },
    ]);
    setShowAddMenu(false);
  };

  const removeDocument = (id: string) => {
    if (docList.length === 1) return;
    setDocList((prev) => prev.filter((d) => d.id !== id));
  };

  const updateDocField = (id: string, field: keyof DocItem, value: any) => {
    setDocList((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const totalFee = docList.reduce((acc, d) => acc + (d.fee || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !residentId) {
        throw new Error("Your resident account must be verified before submitting a request.");
      }
      const transactionSessionId = initialSessionId || `TXN-${Date.now().toString(36).toUpperCase()}`;

      const invalidDoc = docList.find((doc) => {
        if (!doc.purpose.trim()) return true;
        if (doc.type === "business" && (!doc.businessName?.trim() || !doc.businessNature?.trim() || !doc.businessAddress?.trim())) return true;
        if (doc.type === "residency" && doc.attachments.length === 0) return true;
        if (doc.type === "business" && doc.attachments.length < 1) return true;
        return false;
      });
      if (invalidDoc) {
        throw new Error(
          invalidDoc.type === "residency"
            ? "Please attach proof of address for the Certificate of Residency."
            : invalidDoc.type === "business"
            ? "Business Clearance requires a business address and at least one registration or supporting document."
            : "Please complete all required fields before submitting."
        );
      }

      const { data: requestTransaction, error: transactionError } = await supabase
        .from("request_transactions")
        .insert({
          resident_id: residentId,
          user_id: user.id,
          session_id: transactionSessionId,
          status: "Pending",
          total_fee: totalFee,
          payment_status: totalFee === 0 ? "Free" : "Unpaid",
        })
        .select("id")
        .single();
      if (transactionError || !requestTransaction) {
        throw new Error(transactionError?.message || "Unable to create the request transaction.");
      }

      // Insert each requested document in transaction bundle
      for (const doc of docList) {
        // Find or create document_type
        let { data: docType } = await supabase
          .from("document_types")
          .select("id")
          .eq("name", doc.title)
          .maybeSingle();

        if (!docType) throw new Error(`${doc.title} is not configured by the Barangay. Please contact the administrator.`);

        // Build structured form data
        const formDataPayload: Record<string, any> = {
          purpose: doc.purpose,
          contactNumber: contactNumber,
          requestedVia: "Chatbot AI Dynamic Form",
          requirementsStatus: doc.attachments.length > 0 ? "Complete" : "Pending",
          ...doc.customFields,
        };

        if (doc.type === "clearance") {
          formDataPayload.idType = doc.idType;
        } else if (doc.type === "indigency") {
          formDataPayload.incomeBracket = doc.incomeBracket;
          formDataPayload.dependentsCount = doc.dependentsCount;
          formDataPayload.assistanceType = doc.assistanceType;
        } else if (doc.type === "residency") {
          formDataPayload.yearsResiding = doc.yearsResiding;
          formDataPayload.purokAddress = doc.purokAddress;
        } else if (doc.type === "business") {
          formDataPayload.businessName = doc.businessName;
          formDataPayload.businessNature = doc.businessNature;
          formDataPayload.registrationType = doc.registrationType;
          formDataPayload.ownerContactNumber = doc.ownerContactNumber || contactNumber;
          formDataPayload.dtiSecRegistrationNo = doc.dtiSecRegistrationNo;
          formDataPayload.tin = doc.tin;
          formDataPayload.establishmentType = doc.establishmentType;
          formDataPayload.capitalization = doc.capitalization;
          formDataPayload.grossSalesPreviousYear = doc.grossSalesPreviousYear;
          formDataPayload.businessAddress = doc.businessAddress;
        }

        const { data: requestRow, error } = await supabase.from("document_requests").insert({
          resident_id: residentId,
          document_type_id: docType?.id || null,
          transaction_id: requestTransaction.id,
          status: "Pending",
          fee_amount: doc.fee,
          payment_status: doc.fee === 0 ? "Free" : "Unpaid",
          session_id: transactionSessionId,
          form_data: formDataPayload,
          requirements_status: doc.attachments.length > 0 ? "Complete" : "Pending",
          submitted_at: new Date().toISOString(),
          remarks: `[Session ${transactionSessionId}] ${doc.title}: ${doc.purpose}`,
          requested_date: new Date().toISOString(),
        }).select("id").single();

        if (error) throw new Error(error.message);

        for (const file of doc.attachments) {
          if (file.size > 5 * 1024 * 1024) {
            throw new Error(`${file.name} is larger than the 5 MB upload limit.`);
          }
          const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
          if (file.type && !allowedTypes.includes(file.type)) {
            throw new Error(`${file.name} is not a supported requirement file type.`);
          }
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const storagePath = `${user.id}/${transactionSessionId}/${doc.id}-${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from("request-attachments")
            .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });
          if (uploadError) throw new Error(`Unable to upload ${file.name}: ${uploadError.message}`);

          const { error: attachmentError } = await supabase.from("documents").insert({
            request_id: requestRow?.id,
            file_url: storagePath,
            file_name: file.name,
            mime_type: file.type || "application/octet-stream",
            document_kind: "attachment",
            uploaded_by: user.id,
            field_snapshot: { service: doc.title, session_id: transactionSessionId },
          });
          if (attachmentError) throw new Error(`Unable to record ${file.name}: ${attachmentError.message}`);
        }

        // A Business Clearance request also creates the pending business
        // registry record, so the Business Management module is not isolated
        // from the resident transaction.
        if (doc.type === "business" && doc.businessName?.trim()) {
          const { error: businessError } = await supabase.from("businesses").insert({
            owner_id: residentId,
            business_name: doc.businessName.trim(),
            business_type: doc.businessNature || "Other",
            business_nature: doc.businessNature || null,
            registration_type: doc.registrationType || "New",
            owner_contact_number: doc.ownerContactNumber || contactNumber || null,
            dti_sec_registration_no: doc.dtiSecRegistrationNo || null,
            tin: doc.tin || null,
            establishment_type: doc.establishmentType || null,
            capitalization: doc.capitalization ? Number(doc.capitalization) : null,
            gross_sales_previous_year: doc.grossSalesPreviousYear ? Number(doc.grossSalesPreviousYear) : null,
            address: doc.businessAddress || "Barangay address on file",
            status: "Pending",
          });
          if (businessError) throw new Error(businessError.message);
        }
      }

      await supabase.from("transactions").insert({
        user_id: user.id,
        module: "Documents",
        action: "Create Request",
        description: `Submitted ${docList.map((d) => d.title).join(", ")} via AI session ${transactionSessionId}.`,
      });

      const summary = {
        titles: docList.map((d) => d.title),
        totalFee,
        batchId: transactionSessionId,
      };

      setSubmittedSummary(summary);
      setSubmitted(true);

      if (onSubmitted) {
        onSubmitted({
          titles: summary.titles,
          totalFee: summary.totalFee,
          sessionId: transactionSessionId,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit document requests.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted && submittedSummary) {
    return (
      <div className="my-3 p-4 bg-emerald-50/90 border border-emerald-300 rounded-2xl text-xs space-y-3 animate-in fade-in shadow-xs">
        <div className="flex items-center gap-2 text-emerald-900 font-bold">
          <div className="h-7 w-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-xs font-extrabold">Application Submitted Successfully!</span>
            <span className="text-[10px] text-emerald-700 font-mono">Transaction #{submittedSummary.batchId.slice(0, 10)}</span>
          </div>
        </div>

        <div className="bg-white/80 rounded-xl p-3 border border-emerald-200 space-y-1.5 text-[11px]">
          <div className="font-semibold text-emerald-950">Requested Documents ({submittedSummary.titles.length}):</div>
          <ul className="list-disc pl-4 text-emerald-800 space-y-0.5">
            {submittedSummary.titles.map((t, idx) => (
              <li key={idx} className="font-medium">{t}</li>
            ))}
          </ul>
          <div className="pt-2 border-t border-emerald-100 flex items-center justify-between font-bold text-gray-900">
            <span>Total Estimated Fee:</span>
            <span className={submittedSummary.totalFee === 0 ? "text-emerald-600" : "text-blue-700"}>
              {submittedSummary.totalFee === 0 ? "FREE (₱0.00)" : `₱${submittedSummary.totalFee.toFixed(2)}`}
            </span>
          </div>
        </div>

        <div className="bg-blue-50 text-blue-900 p-2.5 rounded-xl text-[11px] flex items-start gap-2 border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Barangay staff will review your application. You will be notified once ready for pickup at the Barangay Hall.
          </p>
        </div>

        <Link
          href="/requests"
          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-center font-bold rounded-xl text-xs shadow-xs transition-all block"
        >
          Track in My Requests →
        </Link>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-label="Interactive Document Application Form"
      className="my-3 p-4 bg-gradient-to-br from-blue-50 via-indigo-50/70 to-slate-50 border-2 border-blue-200 rounded-2xl shadow-sm text-xs space-y-3.5 animate-in slide-in-from-bottom-2 duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-blue-600 text-white rounded-lg flex items-center justify-center shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="block text-xs font-bold text-blue-950">Online Document Application</span>
            <span className="text-[10px] text-blue-600 font-medium">One Session • Multiple Documents Supported</span>
          </div>
        </div>
        <div className="bg-blue-100/90 text-blue-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
          {docList.length} {docList.length === 1 ? "Document" : "Documents"}
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 bg-red-100 border border-red-200 text-red-700 text-[11px] rounded-xl font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Document items list */}
        {docList.map((doc, idx) => (
          <div
            key={doc.id}
            className="p-3 bg-white rounded-xl border border-blue-100 shadow-2xs space-y-2.5 relative"
          >
            <div className="flex items-center justify-between border-b pb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                <span className="h-4 w-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span>{doc.title}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${doc.fee === 0 ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                  {doc.fee === 0 ? "FREE" : `₱${doc.fee.toFixed(2)}`}
                </span>
              </div>
              {docList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDocument(doc.id)}
                  title="Remove this document"
                  className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Purpose input */}
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                Purpose / Layunin *
              </label>
              <input
                type="text"
                required
                placeholder={
                  doc.type === "clearance"
                    ? "e.g. Local Employment, Postal ID, Passport application"
                    : doc.type === "indigency"
                    ? "e.g. Medical Assistance (Hospital), Scholarship, Burial Aid"
                    : doc.type === "residency"
                    ? "e.g. Bank Account opening, Meralco/Water connection"
                    : "e.g. Sari-Sari Store Permit, Eatery, Commercial Operation"
                }
                value={doc.purpose}
                onChange={(e) => updateDocField(doc.id, "purpose", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-gray-50/50 focus:bg-white"
              />
            </div>

            {/* Document Specific Fields */}
            {doc.type === "clearance" && (
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                  Presented Valid ID
                </label>
                <select
                  value={doc.idType}
                  onChange={(e) => updateDocField(doc.id, "idType", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-blue-600 outline-none"
                >
                  <option value="PhilID / National ID">Philippine National ID (PhilID)</option>
                  <option value="Voter's ID / Certificate">Voter&apos;s ID / Certificate</option>
                  <option value="Driver's License">Driver&apos;s License</option>
                  <option value="SSS / UMID / GSIS">SSS / UMID / GSIS Card</option>
                  <option value="Postal ID">Postal ID</option>
                  <option value="Student ID / School ID">Student ID</option>
                </select>
              </div>
            )}

            {doc.type === "indigency" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Monthly Income
                  </label>
                  <select
                    value={doc.incomeBracket}
                    onChange={(e) => updateDocField(doc.id, "incomeBracket", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="Below ₱5,000">Below ₱5,000</option>
                    <option value="₱5,000 - ₱10,000">₱5,000 – ₱10,000</option>
                    <option value="₱10,000 - ₱15,000">₱10,000 – ₱15,000</option>
                    <option value="No Regular Income">No Regular Income</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Dependents
                  </label>
                  <select
                    value={doc.dependentsCount}
                    onChange={(e) => updateDocField(doc.id, "dependentsCount", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="1">1 Person</option>
                    <option value="2-3">2 – 3 Persons</option>
                    <option value="4-6">4 – 6 Persons</option>
                    <option value="7+">7+ Persons</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Assistance Needed *
                  </label>
                  <select
                    required
                    value={doc.assistanceType}
                    onChange={(e) => updateDocField(doc.id, "assistanceType", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-blue-600 outline-none"
                  >
                    <option>Medical / Hospitalization</option>
                    <option>Education / Scholarship</option>
                    <option>Burial Assistance</option>
                    <option>Legal Assistance</option>
                    <option>Other Social Assistance</option>
                  </select>
                </div>
              </div>
            )}

            {doc.type === "residency" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Years Living Here
                  </label>
                  <select
                    value={doc.yearsResiding}
                    onChange={(e) => updateDocField(doc.id, "yearsResiding", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="6 months - 1 year">6 mos – 1 year</option>
                    <option value="1 - 3 years">1 – 3 years</option>
                    <option value="4 - 10 years">4 – 10 years</option>
                    <option value="10+ years / Since birth">10+ years / Since birth</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Purok / Zone
                  </label>
                  <select
                    value={doc.purokAddress}
                    onChange={(e) => updateDocField(doc.id, "purokAddress", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-blue-600 outline-none"
                  >
                    {["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 7"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {doc.type === "business" && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cruz Sari-Sari Store, JD Rice Dealer"
                    value={doc.businessName}
                    onChange={(e) => updateDocField(doc.id, "businessName", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Business Nature / Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Retail, Food & Beverage, Salon, Auto Repair"
                    value={doc.businessNature}
                    onChange={(e) => updateDocField(doc.id, "businessNature", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Registration Type *
                  </label>
                  <select
                    required
                    value={doc.registrationType}
                    onChange={(e) => updateDocField(doc.id, "registrationType", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-blue-600 outline-none"
                  >
                    <option>New</option>
                    <option>Renewal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    Establishment Type *
                  </label>
                  <input
                    required
                    type="text"
                    value={doc.establishmentType}
                    onChange={(e) => updateDocField(doc.id, "establishmentType", e.target.value)}
                    placeholder="Sari-sari store, eatery, salon"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    DTI / SEC / CDA Registration No.
                  </label>
                  <input
                    type="text"
                    value={doc.dtiSecRegistrationNo}
                    onChange={(e) => updateDocField(doc.id, "dtiSecRegistrationNo", e.target.value)}
                    placeholder="Registration number"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">Owner TIN</label>
                  <input
                    type="text"
                    value={doc.tin}
                    onChange={(e) => updateDocField(doc.id, "tin", e.target.value)}
                    placeholder="TIN (if available)"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">Capitalization (₱)</label>
                  <input
                    type="number"
                    min="0"
                    value={doc.capitalization}
                    onChange={(e) => updateDocField(doc.id, "capitalization", e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">Business Address *</label>
                  <input
                    required
                    type="text"
                    value={doc.businessAddress}
                    onChange={(e) => updateDocField(doc.id, "businessAddress", e.target.value)}
                    placeholder="House no., street, purok"
                    className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
                  />
                </div>
              </div>
            )}

            {Array.isArray(formSchema?.fields) && formSchema.fields
              .filter((field) => !["purpose", "document_type", "idType", "incomeBracket", "dependentsCount", "yearsResiding", "purokAddress", "businessName", "businessNature"].includes(field.name))
              .map((field) => (
                <div key={field.name}>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
                    {field.label || field.name}{field.required ? " *" : ""}
                  </label>
                  {field.type === "select" ? (
                    <select
                      required={field.required}
                      value={doc.customFields[field.name] || ""}
                      onChange={(e) => setDocList((prev) => prev.map((item) => item.id === doc.id ? { ...item, customFields: { ...item.customFields, [field.name]: e.target.value } } : item))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:border-blue-600 outline-none"
                    >
                      <option value="">Select...</option>
                      {(field.options || []).map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      required={field.required}
                      type={field.type === "number" || field.type === "date" ? field.type : "text"}
                      value={doc.customFields[field.name] || ""}
                      onChange={(e) => setDocList((prev) => prev.map((item) => item.id === doc.id ? { ...item, customFields: { ...item.customFields, [field.name]: e.target.value } } : item))}
                      placeholder={field.placeholder}
                      className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
                    />
                  )}
                </div>
              ))}

            <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/60 p-2.5">
              <label className="block text-[10px] font-bold text-blue-900 mb-1 uppercase tracking-wider">
                Supporting Documents {doc.type === "residency" || doc.type === "business" ? "*" : "(optional)"}
              </label>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setDocList((prev) => prev.map((item) => item.id === doc.id ? { ...item, attachments: Array.from(e.target.files || []) } : item))}
                className="w-full text-[10px] text-gray-600 file:mr-2 file:rounded-md file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-white"
              />
              {doc.attachments.length > 0 && (
                <p className="mt-1 text-[10px] text-blue-800">{doc.attachments.length} file(s) selected: {doc.attachments.map((file) => file.name).join(", ")}</p>
              )}
              <p className="mt-1 text-[9px] text-blue-700">Accepted: PDF, DOC/DOCX, JPG, or PNG. Maximum size is enforced by the Barangay storage policy.</p>
            </div>
          </div>
        ))}

        {/* Add Another Document in this Session */}
        {docList.length < AVAILABLE_DOCS.length && (
          <div className="pt-1">
            {!showAddMenu ? (
              <button
                type="button"
                onClick={() => setShowAddMenu(true)}
                className="w-full py-1.5 bg-blue-100/70 hover:bg-blue-100 text-blue-800 font-semibold rounded-xl text-[11px] border border-dashed border-blue-300 transition-all flex items-center justify-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Document to this Request
              </button>
            ) : (
              <div className="p-2.5 bg-white rounded-xl border border-blue-200 shadow-sm space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                  <span>Select additional document:</span>
                  <button
                    type="button"
                    onClick={() => setShowAddMenu(false)}
                    className="text-gray-400 hover:text-gray-600 text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {AVAILABLE_DOCS.filter((d) => !docList.some((cur) => cur.type === d.type)).map((d) => (
                    <button
                      key={d.type}
                      type="button"
                      onClick={() => addDocument(d)}
                      className="p-2 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-left transition-all"
                    >
                      <div className="font-bold text-[11px] text-gray-900 truncate">{d.title}</div>
                      <div className="text-[10px] text-blue-600 font-semibold">
                        {d.fee === 0 ? "FREE" : `₱${d.fee.toFixed(2)}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact info */}
        <div>
          <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase tracking-wider">
            Active Contact / Mobile Number (for Pickup SMS / Alert)
          </label>
          <input
            type="tel"
            placeholder="e.g. 0917 123 4567"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-600 bg-white"
          />
        </div>

        {/* Total Fee & Submit Button */}
        <div className="pt-2 border-t border-blue-200/80 flex items-center justify-between font-bold text-xs text-gray-900">
          <span>Estimated Fee Total:</span>
          <span className={`text-sm ${totalFee === 0 ? "text-emerald-700 font-extrabold" : "text-blue-700 font-extrabold"}`}>
            {totalFee === 0 ? "FREE (₱0.00)" : `₱${totalFee.toFixed(2)}`}
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || docList.some((d) => !d.purpose.trim())}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting Request...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Submit {docList.length === 1 ? docList[0].title : `${docList.length} Documents`} Application
            </>
          )}
        </button>
      </form>
    </div>
  );
}
