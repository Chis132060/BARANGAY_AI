"use client";

export type OfflineTicket = {
  id: string; userId: string; category: string; subject: string; description: string;
  createdAt: string; attempts: number; nextRetryAt?: number; state: "queued" | "needs_attention";
};
const DATABASE = "barangay-resident-offline-v1";
const STORE = "support-outbox";
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("userId", "userId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = fn(tx.objectStore(STORE));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function queueTicket(item: OfflineTicket) {
  const pending = await listTickets(item.userId);
  if (pending.length >= 20 && !pending.some(x => x.id === item.id)) throw new Error("At most 20 offline support tickets can be queued.");
  await transaction("readwrite", store => store.put(item));
}
export async function listTickets(userId: string): Promise<OfflineTicket[]> {
  return transaction("readonly", store => store.index("userId").getAll(userId));
}
export async function removeTicket(id: string) {
  await transaction("readwrite", store => store.delete(id));
}
export async function clearTickets(userId: string) {
  const items = await listTickets(userId);
  for (const item of items) await removeTicket(item.id);
}

export async function syncTickets(supabase: any, userId: string): Promise<{ sent: number; failed: number }> {
  if (!navigator.onLine) return { sent: 0, failed: 0 };
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || user?.id !== userId) return { sent: 0, failed: 0 };
  let sent = 0, failed = 0;
  for (const item of await listTickets(userId)) {
    if (item.state === "needs_attention" || (item.nextRetryAt && item.nextRetryAt > Date.now())) continue;
    const { error: insertError } = await supabase.from("support_tickets").insert({
      resident_user_id: userId, category: item.category, subject: item.subject,
      description: item.description, client_operation_id: item.id,
    });
    let confirmed = !insertError;
    if (insertError?.code === "23505") {
      const { data: existing, error: lookupError } = await supabase.from("support_tickets")
        .select("id").eq("resident_user_id", userId).eq("client_operation_id", item.id).maybeSingle();
      confirmed = !lookupError && !!existing;
    }
    if (confirmed) {
      await removeTicket(item.id);
      sent++;
    } else if (insertError?.code === "42501" || insertError?.code === "23514" || insertError?.code === "23503") {
      await queueTicket({ ...item, state: "needs_attention", attempts: item.attempts + 1 });
      failed++;
    } else {
      await queueTicket({ ...item, attempts: item.attempts + 1,
        nextRetryAt: Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** Math.min(item.attempts, 5)) });
      failed++;
    }
  }
  return { sent, failed };
}
