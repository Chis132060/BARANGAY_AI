"use client";

import { useState } from "react";
import { FileText, Printer, CheckCircle, Clock, MapPin, DollarSign, Eye } from "lucide-react";
import type { DocumentRequestItem } from "../../actions";
import { CertificateTemplateModal } from "./CertificateTemplateModal";

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Under Review": "bg-blue-100 text-blue-800 border-blue-200",
  Approved: "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Ready for Pickup": "bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold",
  Released: "bg-purple-100 text-purple-800 border-purple-200",
  Completed: "bg-green-100 text-green-800 border-green-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
};

interface RequestsTableProps {
  requests: DocumentRequestItem[];
  onAction: (
    requestId: string,
    status: string,
    remarks?: string,
    customFee?: number,
    paymentStatus?: "Unpaid" | "Paid" | "Waived" | "Free",
    pickupInstructions?: string,
    paymentDueDate?: string,
    paymentReference?: string,
    paymentNotes?: string
  ) => Promise<void>;
}

export function RequestsTable({ requests, onAction }: RequestsTableProps) {
  const [selectedForCert, setSelectedForCert] = useState<DocumentRequestItem | null>(null);
  const [pickupModalReq, setPickupModalReq] = useState<DocumentRequestItem | null>(null);

  // Pickup Form State
  const [pickupFee, setPickupFee] = useState<number>(50);
  const [pickupPaymentStatus, setPickupPaymentStatus] = useState<"Unpaid" | "Paid" | "Waived" | "Free">("Unpaid");
  const [pickupInstructions, setPickupInstructions] = useState("Please proceed to Window 2 with 1 Valid ID and exact payment.");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const openPickupModal = (req: DocumentRequestItem) => {
    setPickupModalReq(req);
    const defaultFee = req.fee_amount !== undefined ? req.fee_amount : (req.document_type?.name?.toLowerCase().includes("indigency") ? 0 : 50);
    setPickupFee(defaultFee);
    setPickupPaymentStatus(defaultFee === 0 ? "Free" : (req.payment_status || "Unpaid"));
    setPickupInstructions(req.pickup_instructions || "Please proceed to Window 2 with 1 Valid ID and exact payment.");
    setPaymentDueDate(req.payment_due_date ? req.payment_due_date.slice(0, 10) : "");
    setPaymentReference(req.payment_reference || "");
    setPaymentNotes(req.payment_notes || "");
  };

  const handleConfirmPickup = async () => {
    if (!pickupModalReq) return;
    setLoading(true);
    try {
      await onAction(
        pickupModalReq.id,
        "Ready for Pickup",
        pickupModalReq.remarks,
        pickupFee,
        pickupPaymentStatus,
        pickupInstructions,
        paymentDueDate,
        paymentReference,
        paymentNotes
      );
      setPickupModalReq(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-6 py-4">Resident / Applicant</th>
                <th className="px-6 py-4">Document Type</th>
                <th className="px-6 py-4">Fee &amp; Payment</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Purpose / Remarks</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    No document requests found in this queue.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const isFree = req.fee_amount === 0 || req.payment_status === "Free";
                  return (
                    <tr key={req.id} className="hover:bg-muted/10 transition-colors">
                      {/* Resident Info */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">
                          {req.resident ? `${req.resident.last_name}, ${req.resident.first_name}` : "Walk-In / Online Applicant"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {req.resident?.addresses?.[0]?.purok || "Barangay Resident"}
                          {req.session_id && (
                            <span className="ml-1.5 font-mono text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              Batch: {req.session_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Document Type */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">
                          {req.document_type ? req.document_type.name : "Barangay Document"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(req.requested_date).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Fee & Payment */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-xs">
                          {isFree ? (
                            <span className="text-emerald-600">FREE</span>
                          ) : (
                            <span className="text-blue-700">₱{(req.fee_amount ?? 0).toFixed(2)}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          <span className={`inline-block px-1.5 py-0.2 rounded font-semibold ${
                            req.payment_status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-700"
                          }`}>
                            {req.payment_status || (isFree ? "Free" : "Unpaid")}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLES[req.status] || "bg-gray-100 text-gray-700"}`}>
                          {req.status}
                        </span>
                      </td>

                      {/* Remarks / Form Data */}
                      <td className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">
                        {req.form_data && Object.keys(req.form_data).length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-foreground truncate">{req.form_data.purpose || req.remarks || "—"}</span>
                            {Object.entries(req.form_data)
                              .filter(([k]) => k !== "purpose" && k !== "contactNumber" && k !== "requestedVia")
                              .slice(0, 2)
                              .map(([k, v]) => (
                                <span key={k} className="text-[10px] truncate text-gray-500">
                                  {k}: {String(v)}
                                </span>
                              ))}
                          </div>
                        ) : (
                          req.remarks || "—"
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Generate Filled Out Certificate Button */}
                        <button
                          onClick={() => setSelectedForCert(req)}
                          title="Generate and Print Official Certificate"
                          className="px-2.5 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all inline-flex items-center gap-1"
                        >
                          <Printer className="h-3.5 w-3.5" /> Certificate
                        </button>

                        {/* Status Actions */}
                        {req.status === "Pending" && (
                          <>
                            <button
                              onClick={() => openPickupModal(req)}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-xs"
                            >
                              Ready for Pickup
                            </button>
                            <button
                              onClick={() => onAction(req.id, "Rejected", "Requirements incomplete or unverified")}
                              className="px-2.5 py-1.5 text-xs font-semibold bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {req.status === "Approved" && (
                          <button
                            onClick={() => openPickupModal(req)}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                          >
                            Ready for Pickup
                          </button>
                        )}

                        {req.status === "Ready for Pickup" && (
                          <button
                            onClick={() => onAction(req.id, "Released")}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                          >
                            Mark Released
                          </button>
                        )}

                        {req.status === "Released" && (
                          <button
                            onClick={() => onAction(req.id, "Completed")}
                            className="px-2.5 py-1.5 text-xs font-semibold bg-muted hover:bg-accent text-foreground border rounded-lg transition-all"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Certificate Generator Modal */}
      {selectedForCert && (
        <CertificateTemplateModal
          request={selectedForCert}
          isOpen={!!selectedForCert}
          onClose={() => setSelectedForCert(null)}
        />
      )}

      {/* Set Ready for Pickup Modal */}
      {pickupModalReq && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Notify Resident for Pickup</h3>
                  <p className="text-xs text-muted-foreground">{pickupModalReq.document_type?.name}</p>
                </div>
              </div>
              <button onClick={() => setPickupModalReq(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
                &times;
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Required Fee (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={pickupFee}
                  onChange={(e) => setPickupFee(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Status</label>
                <select
                  value={pickupPaymentStatus}
                  onChange={(e) => setPickupPaymentStatus(e.target.value as any)}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Unpaid">Unpaid (Resident will pay at Barangay Hall)</option>
                  <option value="Paid">Paid</option>
                  <option value="Waived">Waived</option>
                  <option value="Free">Free of Charge (Indigent)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Pickup Instructions for Resident</label>
                <textarea
                  rows={2}
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Due Date</label>
                  <input type="date" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Receipt / Reference No.</label>
                  <input type="text" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="OR number or reference" className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Notes</label>
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} placeholder="Optional payment or collection note" className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setPickupModalReq(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmPickup}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {loading ? "Sending Notice..." : "Confirm & Send Notification"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
