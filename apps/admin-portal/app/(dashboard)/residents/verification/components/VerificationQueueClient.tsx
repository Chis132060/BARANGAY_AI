"use client";

import { useState } from "react";
import {
  UserCheck,
  UserX,
  CheckCircle2,
  Search,
  Eye,
  FileCheck,
  Loader2,
  AlertCircle,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { approveResident, rejectResident } from "../../actions";
import type { PendingResident } from "../../actions";
import { useAuth } from "@/components/auth-provider";

interface VerificationQueueClientProps {
  initialResidents: PendingResident[];
  error: string | null;
}

export function VerificationQueueClient({ initialResidents, error: initialError }: VerificationQueueClientProps) {
  const { hasPermission } = useAuth();
  const [residents, setResidents] = useState<PendingResident[]>(initialResidents);
  const [error, setError] = useState<string | null>(initialError);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const canApprove = hasPermission("residents", "canApprove");

  const filtered = residents.filter((r) => {
    if (r.verification_status !== "Pending") return false;
    if (!search) return true;
    const fullName = `${r.first_name} ${r.last_name}`.toLowerCase();
    return fullName.includes(search.toLowerCase());
  });

  const pendingCount = residents.filter((r) => r.verification_status === "Pending").length;
  const reviewedCount = residents.length - pendingCount;

  async function handleApprove(id: string) {
    setProcessingId(id);
    setError(null);
    try {
      await approveResident(id);
      setResidents((prev) =>
        prev.map((r) => (r.id === id ? { ...r, verification_status: "Verified" } : r))
      );
      const target = residents.find((r) => r.id === id);
      setActionMessage(
        `${target?.first_name} ${target?.last_name} has been verified and granted full resident access!`
      );
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to approve resident");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    setProcessingId(id);
    setError(null);
    try {
      await rejectResident(id, rejectReason || undefined);
      setResidents((prev) =>
        prev.map((r) => (r.id === id ? { ...r, verification_status: "Rejected" } : r))
      );
      const target = residents.find((r) => r.id === id);
      setActionMessage(
        `Registration for ${target?.first_name} ${target?.last_name} was rejected.`
      );
      setRejectModalId(null);
      setRejectReason("");
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to reject resident");
    } finally {
      setProcessingId(null);
    }
  }

  function formatAddress(addr?: { house_number?: string; street?: string; purok?: string }) {
    if (!addr) return "No address recorded";
    const parts = [addr.house_number, addr.street, addr.purok].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "No address recorded";
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min(s) ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour(s) ago`;
    const days = Math.floor(hours / 24);
    return `${days} day(s) ago`;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Resident Verification Queue</h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review self-registered resident accounts and uploaded ID proofs against barangay census records.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700">
              <Clock3 className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">Pending</span>
            </div>
            <p className="mt-1 text-2xl font-extrabold">{pendingCount}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">Reviewed</span>
            </div>
            <p className="mt-1 text-2xl font-extrabold">{reviewedCount}</p>
          </div>
          <div className="hidden rounded-lg border bg-card px-4 py-3 shadow-sm sm:block">
            <div className="flex items-center gap-2 text-blue-700">
              <FileCheck className="h-4 w-4" />
              <span className="text-[11px] font-bold uppercase">Records</span>
            </div>
            <p className="mt-1 text-2xl font-extrabold">{residents.length}</p>
          </div>
        </div>
      </div>

      {/* RBAC Warning */}
      {!canApprove && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-sm shadow-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          You do not have permission to approve or reject resident registrations.
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive font-semibold text-sm shadow-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-destructive/10 rounded">
            <span className="sr-only">Dismiss</span>
            &times;
          </button>
        </div>
      )}

      {/* Success Message */}
      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-sm shadow-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4" />
          {actionMessage}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search pending residents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {filtered.length} pending verification(s)
        </span>
      </div>

      {/* Queue List */}
      {filtered.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center bg-card shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">All caught up! No pending verifications.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="border rounded-lg bg-card shadow-sm transition-all hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3 border-b p-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">
                    Resident Applicant
                  </p>
                  <h3 className="truncate text-lg font-bold text-foreground">
                    {item.first_name} {item.middle_name ? `${item.middle_name} ` : ""}{item.last_name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Submitted {timeAgo(item.created_at)}
                  </p>
                </div>
                <span className="shrink-0 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                  Pending
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-5 text-xs text-muted-foreground">
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="block font-semibold text-foreground">Birth Date</span>
                  {item.birth_date}
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Phone className="h-3.5 w-3.5" /> Contact
                  </span>
                  {item.contact_number || "N/A"}
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="block font-semibold text-foreground">Gender</span>
                  {item.gender}
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <FileCheck className="h-3.5 w-3.5" /> ID Type
                  </span>
                  {item.id_type || "N/A"}
                </div>
                <div className="col-span-2 rounded-lg bg-muted/40 p-3">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Declared Address
                  </span>
                  {formatAddress(item.address)}
                </div>
              </div>

              {/* ID Proof Section */}
              {item.id_photo_url && (
                <div className="space-y-2 px-5 pb-5">
                  <span className="block text-xs font-bold text-foreground">Uploaded Proof of Identity</span>
                  <div className="relative rounded-lg overflow-hidden border bg-black/5 h-44 group">
                    <img
                      src={item.id_photo_url}
                      alt="Uploaded ID Photo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={() => setSelectedId(item.id_photo_url!)}
                      className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1.5 transition-opacity"
                    >
                      <Eye className="h-4 w-4" /> View Full ID Image
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {canApprove && (
                <div className="flex items-center gap-3 border-t bg-muted/20 p-5">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={processingId === item.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs shadow transition-all disabled:opacity-50"
                  >
                    {processingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Approve & Verify Resident
                  </button>
                  <button
                    onClick={() => setRejectModalId(item.id)}
                    disabled={processingId === item.id}
                    className="px-4 py-2.5 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    <UserX className="h-4 w-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full Image Modal */}
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

      {/* Reject Reason Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-foreground">
                <UserX className="h-5 w-5 text-destructive" />
                Reject Registration
              </div>
              <button
                onClick={() => { setRejectModalId(null); setRejectReason(""); }}
                className="p-1.5 hover:bg-accent rounded-full text-muted-foreground"
              >
                &times;
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Rejection Reason (optional)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. ID photo is blurry, information does not match records..."
                className="w-full border rounded-xl px-3.5 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setRejectModalId(null); setRejectReason(""); }}
                className="px-4 py-2 text-sm font-semibold rounded-lg hover:bg-accent border border-border text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectModalId)}
                disabled={processingId === rejectModalId}
                className="flex items-center gap-2 bg-destructive hover:bg-destructive/95 text-destructive-foreground font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-md disabled:opacity-50"
              >
                {processingId === rejectModalId && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
