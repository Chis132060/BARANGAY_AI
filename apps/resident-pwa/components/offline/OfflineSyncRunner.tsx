"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncTickets } from "@/lib/offline/support-outbox";
import { syncReads } from "@/lib/offline/notification-outbox";
import { syncProgramIntents } from "@/lib/offline/program-intents";

let active = false;
async function trySync() {
  if (active || !navigator.onLine) return;
  active = true;
  try {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      const result = await syncTickets(supabase, user.id);
      const readCount = await syncReads(supabase, user.id);
      const programResults = await syncProgramIntents(supabase, user.id);
      if (result.sent || result.failed || readCount || programResults.sent || programResults.failed) window.dispatchEvent(new Event("barangay-outbox-synced"));
    }
  } catch (error) {
    console.warn("Offline support queue will retry on reconnect", error);
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
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
