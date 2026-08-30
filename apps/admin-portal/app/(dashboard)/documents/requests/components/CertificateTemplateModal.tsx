"use client";

import { useState } from "react";
import { Printer, Download, X, FileCheck, Shield, CheckCircle2 } from "lucide-react";
import type { DocumentRequestItem } from "../../actions";

interface CertificateTemplateModalProps {
  request: DocumentRequestItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CertificateTemplateModal({ request, isOpen, onClose }: CertificateTemplateModalProps) {
  const [captainName, setCaptainName] = useState("HON. ROBERTO M. SANTOS");
  const [secretaryName, setSecretaryName] = useState("MARIA ELENA C. CRUZ");
  const [orNumber, setOrNumber] = useState(() => `OR-${Math.floor(100000 + Math.random() * 900000)}`);
  const [certNumber, setCertNumber] = useState(() => `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

  if (!isOpen || !request) return null;

  const residentName = request.resident
    ? `${request.resident.first_name} ${request.resident.middle_name ? request.resident.middle_name + " " : ""}${request.resident.last_name}`.toUpperCase()
    : "RESIDENT NAME";

  const address = request.resident?.addresses?.[0]
    ? `${request.resident.addresses[0].house_number ? request.resident.addresses[0].house_number + ", " : ""}${request.resident.addresses[0].street ? request.resident.addresses[0].street + ", " : ""}${request.resident.addresses[0].purok || "Purok 1"}, Barangay San Jose`
    : "Purok 1, Barangay San Jose";

  const docTitle = (request.document_type?.name || "Barangay Clearance").toUpperCase();
  const purpose = request.form_data?.purpose || request.remarks || "General official transactions";
  const civilStatus = request.resident?.civil_status || "Single";
  const currentDate = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Modal Toolbar (hidden in print) */}
        <div className="print:hidden px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold">Official Document Generator</h2>
              <p className="text-xs text-slate-400">
                Populated from AI Chatbot Request #{request.id.slice(0, 8)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition-all"
            >
              <Printer className="h-4 w-4" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Certificate Preview Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-100 flex justify-center">
          {/* Printable Certificate Page */}
          <div
            id="printable-certificate"
            className="w-full max-w-[210mm] min-h-[280mm] bg-white text-gray-900 p-8 md:p-12 shadow-md border border-gray-300 relative flex flex-col justify-between print:shadow-none print:border-none print:p-8 print:m-0"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* Watermark Seal Background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
              <Shield className="w-96 h-96 text-blue-900" />
            </div>

            {/* Header / Letterhead */}
            <div className="border-b-4 border-double border-blue-900 pb-4 text-center relative">
              <div className="flex items-center justify-between">
                <div className="h-16 w-16 rounded-full border-2 border-blue-900 flex items-center justify-center font-bold text-[10px] text-blue-900 text-center uppercase p-1">
                  Republic Seal
                </div>
                <div className="text-center space-y-0.5">
                  <p className="text-xs font-serif uppercase tracking-widest text-gray-700">Republic of the Philippines</p>
                  <p className="text-xs font-serif uppercase tracking-wider text-gray-700">Province of Cebu • City of Cebu</p>
                  <p className="text-sm font-bold font-serif uppercase tracking-wider text-blue-950">BARANGAY SAN JOSE</p>
                  <p className="text-[11px] font-serif italic text-gray-600">Office of the Punong Barangay</p>
                </div>
                <div className="h-16 w-16 rounded-full border-2 border-blue-900 flex items-center justify-center font-bold text-[10px] text-blue-900 text-center uppercase p-1">
                  Barangay Seal
                </div>
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center my-6">
              <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-widest text-blue-950 font-serif underline decoration-blue-900 decoration-2 underline-offset-8">
                {docTitle}
              </h1>
              <p className="text-xs text-gray-500 mt-2 font-sans uppercase tracking-wider">
                Control No: <span className="font-mono font-bold text-gray-800">{certNumber}</span>
              </p>
            </div>

            {/* Main Certificate Content */}
            <div className="space-y-5 text-sm md:text-base leading-relaxed text-justify text-gray-800 flex-1 px-4">
              <p className="font-bold text-sm tracking-wide">TO WHOM IT MAY CONCERN:</p>

              {docTitle.includes("INDIGENCY") ? (
                <>
                  <p className="indent-8">
                    This is to certify that <strong>{residentName}</strong>, of legal age, {civilStatus.toLowerCase()}, is a bonafide resident of <strong>{address}</strong>.
                  </p>
                  <p className="indent-8">
                    This further certifies that the above-named individual belongs to the <strong>Indigent / Low-Income Bracket</strong> of this Barangay, with an estimated monthly household income of <em>{request.form_data?.incomeBracket || "Below ₱10,000"}</em> with <em>{request.form_data?.dependentsCount || "1"}</em> dependent(s).
                  </p>
                  <p className="indent-8">
                    This certification is issued upon the request of the interested party for the purpose of:
                  </p>
                  <div className="p-3 bg-gray-50 border-l-4 border-blue-900 font-bold text-sm text-blue-950 uppercase tracking-wide">
                    {purpose}
                  </div>
                </>
              ) : docTitle.includes("RESIDENCY") ? (
                <>
                  <p className="indent-8">
                    This is to certify that <strong>{residentName}</strong>, of legal age, {civilStatus.toLowerCase()}, is a permanent and registered resident of <strong>{address}</strong> for {request.form_data?.yearsResiding || "more than 1 year"}.
                  </p>
                  <p className="indent-8">
                    Based on the records of this office, the subject individual is a person of good moral character and a law-abiding citizen with no derogatory record filed in the Lupong Tagapamayapa.
                  </p>
                  <p className="indent-8">
                    This Certificate of Residency is issued upon the request of the bearer for:
                  </p>
                  <div className="p-3 bg-gray-50 border-l-4 border-blue-900 font-bold text-sm text-blue-950 uppercase tracking-wide">
                    {purpose}
                  </div>
                </>
              ) : docTitle.includes("BUSINESS") ? (
                <>
                  <p className="indent-8">
                    This is to certify that <strong>{request.form_data?.businessName || residentName + " COMMERCIAL ENTERPRISE"}</strong>, owned and operated by <strong>{residentName}</strong>, located at <strong>{address}</strong>, has been granted this <strong>BARANGAY BUSINESS CLEARANCE</strong>.
                  </p>
                  <p className="indent-8">
                    The said commercial establishment ({request.form_data?.businessNature || "Commercial Activity"}) has conformed with Barangay rules and local ordinances.
                  </p>
                  <p className="indent-8">
                    Issued for the purpose of Mayor&apos;s Permit Application and Commercial Operations.
                  </p>
                </>
              ) : (
                <>
                  <p className="indent-8">
                    This is to certify that <strong>{residentName}</strong>, of legal age, {civilStatus.toLowerCase()}, Filipino, is a bonafide resident of <strong>{address}</strong>.
                  </p>
                  <p className="indent-8">
                    This further certifies that the subject individual has <strong>NO DEROGATORY RECORD / PENDING CASE</strong> on file with the Barangay Office or Lupong Tagapamayapa, and is known to be of good moral character and standing in the community.
                  </p>
                  <p className="indent-8">
                    This Barangay Clearance is issued upon the request of the aforementioned person for the purpose of:
                  </p>
                  <div className="p-3 bg-gray-50 border-l-4 border-blue-900 font-bold text-sm text-blue-950 uppercase tracking-wide">
                    {purpose}
                  </div>
                </>
              )}

              <p className="indent-8">
                Issued this <strong>{currentDate}</strong> at the Office of the Punong Barangay, Barangay San Jose, Cebu, Philippines.
              </p>
            </div>

            {/* Signature & Seal Block */}
            <div className="mt-8 pt-6 border-t border-gray-300">
              <div className="grid grid-cols-2 gap-8 items-end">
                {/* Resident Signature / Thumbmark */}
                <div className="space-y-4 text-center">
                  <div className="inline-block border-2 border-gray-400 h-20 w-28 rounded-md bg-gray-50/50 p-1 flex items-center justify-center text-[10px] text-gray-400 uppercase">
                    Right Thumbmark
                  </div>
                  <div>
                    <div className="w-48 mx-auto border-b border-gray-800"></div>
                    <p className="text-xs font-bold uppercase mt-1">{residentName}</p>
                    <p className="text-[10px] text-gray-500">Applicant Signature</p>
                  </div>
                </div>

                {/* Barangay Captain & Secretary */}
                <div className="text-center space-y-6">
                  <div>
                    <p className="text-xs text-gray-600 mb-6">Prepared by:</p>
                    <p className="text-xs font-bold uppercase text-gray-900">{secretaryName}</p>
                    <p className="text-[10px] text-gray-500">Barangay Secretary</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 mb-6">Approved &amp; Issued by:</p>
                    <p className="text-sm font-extrabold uppercase text-blue-950 tracking-wider">
                      {captainName}
                    </p>
                    <p className="text-xs font-semibold text-gray-700">Punong Barangay</p>
                  </div>
                </div>
              </div>

              {/* Official Seal and Footnote */}
              <div className="mt-6 pt-3 border-t border-dashed border-gray-300 flex items-center justify-between text-[9px] font-sans text-gray-500">
                <div className="space-y-0.5 font-mono">
                  <span>O.R. No: {orNumber}</span> • <span>Fee: ₱{(request.fee_amount || 0).toFixed(2)}</span> • <span>Status: {request.payment_status || "Paid"}</span>
                </div>
                <div className="font-serif italic text-gray-400">
                  Not valid without official dry seal • Smart Barangay AI System
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
