"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { listTickets } from "@/lib/offline/support-outbox";
import { listQueuedDocuments } from "@/lib/offline/document-outbox";
import { listProgramIntents } from "@/lib/offline/program-intents";
import { pendingReads } from "@/lib/offline/notification-outbox";
import { checkOfflineStorage } from "@/lib/offline/storage-health";

type Counts = { tickets: number; documents: number; programs: number; reads: number; attention: number };
type SyncDetail = { state: "running" | "success" | "error"; sent?: number; failed?: number; time: number; message?: string };

export function OfflineStatusCenter() {
  const [online, setOnline] = useState(true);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [detail, setDetail] = useState<SyncDetail | null>(null);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    let mounted = true;
    async function refresh() {
      setOnline(navigator.onLine);
      try {
        const { data: { session } } = await createClient().auth.getSession();
        if (!mounted) return;
        const id = session?.user?.id;
        if (!id) { setCounts(null); return; }
        const health = await checkOfflineStorage();
        if (!health.available) throw new Error("IndexedDB unavailable");
        const [tickets, documents, programs, reads] = await Promise.all([
          listTickets(id), listQueuedDocuments(id), listProgramIntents(id), pendingReads(id)
        ]);
        if (mounted) {
          setCounts({
            tickets: tickets.length, documents: documents.length, programs: programs.length,
            reads: reads.length,
            attention: [...tickets, ...documents, ...programs].filter(item => item.state === "needs_attention").length
          });
          setStorageError(health.quota && health.usage && health.usage / health.quota > 0.9
            ? "Device storage is over 90% full. Synchronize pending changes before clearing browser data; clearing storage can permanently lose unsent work."
            : "");
        }
      } catch {
        if (mounted) setStorageError("Local storage is unavailable. Offline changes may not be saved.");
      }
    }
    const synced = (event: Event) => {
      const value = (event as CustomEvent<SyncDetail>).detail;
      if (value) setDetail(value);
      void refresh();
    };
    void refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    window.addEventListener("barangay-outbox-synced", synced);
    window.addEventListener("barangay-sync-status", synced);
    return () => {
      mounted = false;
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("barangay-outbox-synced", synced);
      window.removeEventListener("barangay-sync-status", synced);
    };
  }, []);
  const pending = counts ? counts.tickets + counts.documents + counts.programs + counts.reads : 0;
  return <section aria-live="polite" className="bg-slate-50 p-3 text-xs text-slate-700">
    <div className="flex items-center justify-between gap-2">
      <span>{online ? "Device online" : "Device offline"} · {pending} local pending change(s)</span>
      <button type="button" disabled={!online || detail?.state === "running"}
        onClick={() => window.dispatchEvent(new Event("barangay-sync-request"))}
        className="rounded-lg border bg-white px-3 py-1 disabled:opacity-50">Sync now</button>
    </div>
    {counts && pending > 0 && <p className="mt-1">
      Documents: {counts.documents} · Tickets: {counts.tickets} · Programs: {counts.programs} · Notifications: {counts.reads}
      {counts.attention > 0 ? ` · Needs attention: ${counts.attention}` : ""}
    </p>}
    {detail && <p className="mt-1">{detail.state === "running" ? "Syncing pending changes⬦" :
      detail.state === "success" ? `Last sync: ${detail.sent || 0} sent, ${detail.failed || 0} failed · ${new Date(detail.time).toLocaleTimeString()}` :
      detail.message || "Sync failed; queued changes remain on this device."}</p>}
    {storageError && <p role="alert" className="mt-1 text-red-700">{storageError}</p>}
    {pending > 0 && <p className="mt-1">Saved on device does not mean received by the barangay.</p>}
  </section>;
}

