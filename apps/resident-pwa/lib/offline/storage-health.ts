"use client";

/** Best-effort storage capability check; never implies data is durable forever. */
export async function checkOfflineStorage(): Promise<{ available: boolean; persisted: boolean; usage?: number; quota?: number }> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return { available: false, persisted: false };
  const probeName = "barangay-storage-probe-v1";
  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(probeName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("probe");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("probe", "readwrite");
        tx.objectStore("probe").put(Date.now(), "lastChecked");
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      };
    });
    const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
    const persisted = await navigator.storage?.persisted?.().catch(() => false) ?? false;
    return { available: true, persisted, usage: estimate?.usage, quota: estimate?.quota };
  } catch {
    return { available: false, persisted: false };
  }
}
