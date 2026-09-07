"use client";

import { useState, useEffect } from "react";
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
import { approveResident, rejectResident, fetchPendingVerifications } from "../../actions";
import type { PendingResident } from "../../actions";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

interface VerificationQueueClientProps {
  initialResidents: PendingResident[];
  error: string | null;
}

export function VerificationQueueClient({ initialResidents, error: initialError }: VerificationQueueClientProps) {
  const { hasPermission } = useAuth();
  const [residents, setResidents] = useState<PendingResident[]>(initialResidents);
  const [error, setError] = useState<string | null>(initialError);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedResident, setSelectedResident] = useState<PendingResident | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const canApprove = hasPermission("residents", "canApprove");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const channel = supabase
      .channel("verification-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "residents" },
        async () => {
          try {
            const latest = await fetchPendingVerifications();
            if (!cancelled) {
              setResidents(latest);
              setError(null);
            }
          } catch {
            /* keep showing the current list */
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

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
      setSelectedResident(null);
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
      setSelectedResident(null);
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

      {/* Verification Queue Table */}
      {filtered.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center bg-card shadow-sm">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">All caught up! No pending verifications.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-bold">Resident applicant</th>
                  <th className="px-5 py-3 font-bold">Contact</th>
                  <th className="px-5 py-3 font-bold">Declared address</th>
                  <th className="px-5 py-3 font-bold">ID type</th>
                  <th className="px-5 py-3 font-bold">Submitted</th>
                  <th className="px-5 py-3 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedResident(item)}
                        className="text-left font-bold text-primary underline-offset-4 hover:underline"
                      >
                        {item.first_name} {item.middle_name ? `${item.middle_name} ` : ""}{item.last_name}
                      </button>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.email || "No email recorded"}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{item.contact_number || "N/A"}</td>
                    <td className="max-w-[220px] truncate px-5 py-4 text-muted-foreground">{formatAddress(item.address)}</td>
                    <td className="px-5 py-4 text-muted-foreground">{item.id_type || "N/A"}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">{timeAgo(item.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Pending</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resident details dialog */}
      {selectedResident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resident-details-title"
          onClick={() => setSelectedResident(null)}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Resident applicant</p>
                <h2 id="resident-details-title" className="mt-1 text-xl font-extrabold text-foreground">
                  {selectedResident.first_name} {selectedResident.middle_name ? `${selectedResident.middle_name} ` : ""}{selectedResident.last_name}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Submitted {timeAgo(selectedResident.created_at)}</p>
              </div>
              <button type="button" onClick={() => setSelectedResident(null)} className="rounded-full px-3 py-1 text-xl text-muted-foreground hover:bg-muted" aria-label="Close resident details">&times;</button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/40 p-3"><span className="block text-xs font-semibold text-muted-foreground">Email</span><span className="font-medium">{selectedResident.email || "N/A"}</span></div>
              <div className="rounded-xl bg-muted/40 p-3"><span className="block text-xs font-semibold text-muted-foreground">Contact number</span><span className="font-medium">{selectedResident.contact_number || "N/A"}</span></div>
              <div className="rounded-xl bg-muted/40 p-3"><span className="block text-xs font-semibold text-muted-foreground">Birth date</span><span className="font-medium">{selectedResident.birth_date}</span></div>
              <div className="rounded-xl bg-muted/40 p-3"><span className="block text-xs font-semibold text-muted-foreground">Gender</span><span className="font-medium">{selectedResident.gender}</span></div>
              <div className="rounded-xl bg-muted/40 p-3"><span className="block text-xs font-semibold text-muted-foreground">ID type</span><span className="font-medium">{selectedResident.id_type || "N/A"}</span></div>
              <div className="rounded-xl bg-muted/40 p-3 sm:col-span-2"><span className="block text-xs font-semibold text-muted-foreground">Declared address</span><span className="font-medium">{formatAddress(selectedResident.address)}</span></div>
            </div>

            {selectedResident.id_photo_url && (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold">Uploaded proof of identity</p>
                  <button type="button" onClick={() => setSelectedId(selectedResident.id_photo_url!)} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"><Eye className="h-3.5 w-3.5" /> View full image</button>
                </div>
                <img src={selectedResident.id_photo_url} alt="Uploaded proof of identity" className="max-h-64 w-full rounded-xl border bg-black/5 object-contain" />
              </div>
            )}

            {canApprove && (
              <div className="mt-6 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setRejectModalId(selectedResident.id)} disabled={processingId === selectedResident.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive/10 px-5 py-3 text-sm font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"><UserX className="h-4 w-4" /> Reject</button>
                <button type="button" onClick={() => handleApprove(selectedResident.id)} disabled={processingId === selectedResident.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50">
                  {processingId === selectedResident.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  Approve & verify resident
                </button>
              </div>
            )}
          </div>
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
                Rejection Reason (required)
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
                disabled={processingId === rejectModalId || !rejectReason.trim()}
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
