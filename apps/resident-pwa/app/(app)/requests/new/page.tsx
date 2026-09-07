"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, Loader2, FileText, Home, ClipboardList, Building2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { submitDocumentRequest } from "../actions";

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

export default function NewRequestPage() {
  const router = useRouter();
  const supabase = createClient();

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  
  const [purpose, setPurpose] = useState("");
  const [files, setFiles] = useState<Record<string, File>>({});
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocTypes() {
      try {
        const { data, error } = await supabase
          .from("document_types")
          .select("*")
          .order("name");
        
        if (error) throw error;
        setDocumentTypes(data || []);
      } catch (err: any) {
        console.error("Failed to fetch doc types", err);
      } finally {
        setFetching(false);
      }
    }
    fetchDocTypes();
  }, [supabase]);

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

    // Check if all required files are provided
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

      // Submit via Server Action
      await submitDocumentRequest(formData);

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
          <p className="text-xs text-gray-500">Submit an online document application</p>
        </div>
      </div>

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
              1. Select Document Type
            </p>
            <div className="space-y-2">
              {documentTypes.map((docType) => {
                const Icon = getIconForType(docType.name);
                const isSelected = selectedType?.id === docType.id;
                return (
                  <button
                    type="button"
                    key={docType.id}
                    onClick={() => {
                      setSelectedType(docType);
                      setFiles({}); // Reset files on type change
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
                    <div>
                      <p className="text-xs font-bold text-gray-900">{docType.name}</p>
                      <p className="text-[11px] text-gray-500">{docType.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedType && (
            <div className="space-y-5 animate-in fade-in duration-200 pt-4 border-t">
              
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  2. Purpose / Notes
                </p>
                <textarea
                  rows={3}
                  placeholder={`State the purpose for this ${selectedType.name}...`}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                />
              </div>

              {selectedType.requirements_json && selectedType.requirements_json.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    3. Required Attachments
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Uploading & Submitting..." : "Submit Application"}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
