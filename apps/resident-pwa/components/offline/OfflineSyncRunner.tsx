"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncTickets } from "@/lib/offline/support-outbox";
import { syncReads } from "@/lib/offline/notification-outbox";
import { syncProgramIntents } from "@/lib/offline/program-intents";
import { syncQueuedDocuments } from "@/lib/offline/document-outbox";

let active = false;
async function trySync() {
  if (active || !navigator.onLine) return;
  active = true;
  window.dispatchEvent(new CustomEvent("barangay-sync-status", { detail: { state: "running", time: Date.now() } }));
  try {
    const supabase = createClient();
    // Browser connectivity may be true on a captive portal or failed backend.
    // A verified auth round trip is required before any queue writes.
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const result = await syncTickets(supabase, user.id);
      const readCount = await syncReads(supabase, user.id);
      const programResults = await syncProgramIntents(supabase, user.id);
      const documentResults = await syncQueuedDocuments(supabase, user.id);
      const sent = result.sent + readCount + programResults.sent + documentResults.sent;
      const failed = result.failed + programResults.failed + documentResults.failed;
      window.dispatchEvent(new CustomEvent("barangay-sync-status", { detail: { state: failed ? "error" : "success", sent, failed, time: Date.now(), message: failed ? "Some changes could not sync. They remain pending or need attention." : undefined } }));
      window.dispatchEvent(new Event("barangay-outbox-synced"));
    } else {
      window.dispatchEvent(new CustomEvent("barangay-sync-status", { detail: { state: "error", time: Date.now(), message: "Sign in and reconnect to synchronize your pending changes." } }));
    }
  } catch (error) {
    console.warn("Offline support queue will retry on reconnect", error);
    window.dispatchEvent(new CustomEvent("barangay-sync-status", { detail: { state: "error", time: Date.now(), message: "Synchronization failed; your queued changes remain stored locally." } }));
  } finally {
    active = false;
  }
}
/** Foreground fallback for browsers without reliable Background Sync. */
export function OfflineSyncRunner() {
  useEffect(() => {
    const onOnline = () => void trySync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void trySync();
    };
    void trySync();
    window.addEventListener("online", onOnline);
    window.addEventListener("barangay-sync-request", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("barangay-sync-request", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
