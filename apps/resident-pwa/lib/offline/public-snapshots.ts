"use client";

const DB_NAME = "barangay-public-snapshots-v1";
const STORE = "snapshots";
type Snapshot<T> = { key: string; data: T; cachedAt: number; expiresAt: number };
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE))
        req.result.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function perform<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      let value: T;
      req.onsuccess = () => { value = req.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
const PUBLIC_KEYS = new Set(["document-types", "announcements", "barangay-programs", "barangay-organizations"]);
export async function savePublicSnapshot<T>(key: string, data: T, ttlMs: number): Promise<void> {
  if (!PUBLIC_KEYS.has(key)) throw new Error("Cannot persist unapproved offline snapshot");
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || ttlMs > 24 * 60 * 60 * 1000)
    throw new Error("Invalid cache duration");
  await perform("readwrite", store => store.put({ key, data, cachedAt: Date.now(), expiresAt: Date.now() + ttlMs }));
}
export async function loadPublicSnapshot<T>(key: string): Promise<{ data: T; cachedAt: number; stale: boolean } | null> {
  if (!PUBLIC_KEYS.has(key)) return null;
  const result = await perform<Snapshot<T> | undefined>("readonly", store => store.get(key));
  if (!result) return null;
  // Expiration means revalidation is needed, not that offline public content disappears.
  // These allowlisted snapshots are public; callers must label old data as stale.
  return { data: result.data, cachedAt: result.cachedAt, stale: result.expiresAt < Date.now() };
}
