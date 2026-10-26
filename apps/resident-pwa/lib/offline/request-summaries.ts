"use client";

/** Minimal per-user offline history. Never persist form_data, payment references,
 * personal attachments or unverified server responses. */
export type RequestSummary = {
  id: string; status: string; requested_date: string;
  fee_amount?: number; payment_status?: string;
  pickup_date?: string; document_type?: { name: string } | null;
};
const DB = "barangay-private-request-summaries-v1";
const STORE = "summaries";
const MAX_ITEMS = 100;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("Local storage unavailable")); return; }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "userId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = action(tx.objectStore(STORE));
      let value: T;
      req.onsuccess = () => { value = req.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

export async function saveRequestSummaries(userId: string, requests: RequestSummary[]): Promise<void> {
  if (!userId) throw new Error("Missing user");
  const minimal = requests.slice(0, MAX_ITEMS).map(r => ({
    id: r.id, status: r.status, requested_date: r.requested_date,
    fee_amount: r.fee_amount, payment_status: r.payment_status,
    pickup_date: r.pickup_date, document_type: r.document_type
      ? { name: r.document_type.name } : null,
  }));
  await transact("readwrite", store => store.put({ userId, updatedAt: Date.now(), requests: minimal }));
}

export async function loadRequestSummaries(userId: string): Promise<{ requests: RequestSummary[]; updatedAt: number; stale: boolean } | null> {
  if (!userId) return null;
  const row = await transact<any>("readonly", store => store.get(userId));
  if (!row || !Array.isArray(row.requests)) return null;
  return { requests: row.requests, updatedAt: row.updatedAt, stale: Date.now() - row.updatedAt > MAX_AGE };
}

export async function clearRequestSummaries(userId: string): Promise<void> {
  if (userId) await transact("readwrite", store => store.delete(userId));
}
