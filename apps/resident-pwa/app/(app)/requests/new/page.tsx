import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = { title: "New Request" };

const REQUEST_TYPES = [
  { value: "barangay_clearance",       label: "Barangay Clearance",        emoji: "📄" },
  { value: "certificate_of_residency", label: "Certificate of Residency",  emoji: "🏠" },
  { value: "certificate_of_indigency", label: "Certificate of Indigency",  emoji: "📋" },
  { value: "business_permit",          label: "Business Permit",           emoji: "🏪" },
  { value: "blotter_report",           label: "Blotter Report",            emoji: "📝" },
  { value: "other",                    label: "Other",                     emoji: "📌" },
];

export default function NewRequestPage() {
  return (
    <div className="p-4">
      {/* Back button */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/requests" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">New Request</h1>
      </div>

      {/* Step 1 — choose type */}
      <section className="mb-6">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Select Request Type
        </p>
        <div className="space-y-2">
          {REQUEST_TYPES.map(({ value, label, emoji }) => (
            <button
              key={value}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200
                         hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-sm font-medium text-gray-800">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* TODO: Step 2 — dynamic form fields based on selected type (RHF + Zod) */}
      {/* TODO: Step 3 — file attachments via Supabase Storage */}
      {/* TODO: Step 4 — submit and show confirmation */}
    </div>
  );
}
