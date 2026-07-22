"use client";

import { useState } from "react";
import { UserCheck, UserX, ShieldAlert, CheckCircle2, Search, FileText, Eye, AlertCircle } from "lucide-react";

interface PendingResident {
  id: string;
  name: string;
  birthDate: string;
  contactNumber: string;
  address: string;
  idType: string;
  idPhotoUrl: string;
  submittedAt: string;
  status: "Pending" | "Verified" | "Rejected";
}

const initialPending: PendingResident[] = [
  {
    id: "pv-101",
    name: "Emilio Aguinaldo",
    birthDate: "1988-03-22",
    contactNumber: "09179998888",
    address: "124 Rizal St, Purok 1",
    idType: "Philippine Identification (PhilID / ePhilID)",
    idPhotoUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600",
    submittedAt: "10 mins ago",
    status: "Pending",
  },
  {
    id: "pv-102",
    name: "Gabriela Silang",
    birthDate: "1992-07-14",
    contactNumber: "09224441111",
    address: "45 Magsaysay Ave, Purok 3",
    idType: "Voter's ID / Voter's Certification",
    idPhotoUrl: "https://images.unsplash.com/photo-1589386417686-0d34b5903d23?w=600",
    submittedAt: "1 hour ago",
    status: "Pending",
  },
];

export default function VerificationQueuePage() {
  const [items, setItems] = useState<PendingResident[]>(initialPending);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const handleAction = (id: string, action: "Verified" | "Rejected") => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: action } : item))
    );
    const target = items.find((i) => i.id === id);
    setActionMessage(
      action === "Verified"
        ? `✅ ${target?.name} has been verified and granted full resident access!`
        : `❌ Registration for ${target?.name} was rejected.`
    );

    setTimeout(() => setActionMessage(null), 4000);
  };

  const pendingCount = items.filter((i) => i.status === "Pending").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Resident Verification Queue</h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Review self-registered resident accounts and uploaded ID proofs against barangay census records.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-sm shadow-sm animate-in fade-in">
          {actionMessage}
        </div>
      )}

      {/* Queue List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((item) => {
          const isPending = item.status === "Pending";
          return (
            <div
              key={item.id}
              className={`border rounded-2xl bg-card p-5 shadow-sm space-y-4 transition-all ${
                isPending ? "hover:border-primary/50" : "opacity-60 bg-muted/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">Submitted {item.submittedAt}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    item.status === "Pending"
                      ? "bg-amber-100 text-amber-800"
                      : item.status === "Verified"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs border-y py-3 text-muted-foreground">
                <div>
                  <span className="block font-semibold text-foreground">Birth Date</span>
                  {item.birthDate}
                </div>
                <div>
                  <span className="block font-semibold text-foreground">Contact</span>
                  {item.contactNumber}
                </div>
                <div className="col-span-2">
                  <span className="block font-semibold text-foreground">Declared Address</span>
                  {item.address}
                </div>
              </div>

              {/* ID Proof Section */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-foreground">Uploaded Proof of Identity</span>
                <p className="text-[11px] text-muted-foreground font-mono bg-muted/40 p-2 rounded-lg border">
                  {item.idType}
                </p>
                <div className="relative rounded-xl overflow-hidden border bg-black/5 h-44 group">
                  <img
                    src={item.idPhotoUrl}
                    alt="Uploaded ID Photo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <button
                    onClick={() => setSelectedId(item.idPhotoUrl)}
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition-opacity"
                  >
                    <Eye className="h-4 w-4" /> View Full ID Image
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              {isPending && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleAction(item.id, "Verified")}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow transition-all"
                  >
                    <UserCheck className="h-4 w-4" /> Approve & Verify Resident
                  </button>
                  <button
                    onClick={() => handleAction(item.id, "Rejected")}
                    className="px-4 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold rounded-xl text-xs transition-colors"
                  >
                    <UserX className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal for full image view */}
      {selectedId && (
        <div
          onClick={() => setSelectedId(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in"
        >
          <div className="relative max-w-2xl bg-card p-2 rounded-2xl shadow-2xl">
            <img src={selectedId} alt="Full ID Preview" className="max-h-[80vh] w-auto rounded-xl object-contain" />
            <p className="text-center text-xs text-muted-foreground mt-2">Click anywhere to close preview</p>
          </div>
        </div>
      )}
    </div>
  );
}
