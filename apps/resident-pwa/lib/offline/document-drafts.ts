"use client";
export type DocumentDraft = {
  id: string; userId: string; documentTypeId: string; documentTypeName: string;
  purpose: string; updatedAt: string;
};
const DB_NAME = "barangay-document-drafts-v1";
const STORE = "drafts";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains(STORE)) {
        const s = r.result.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("userId", "userId");
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function transact<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise((resolve,reject)=>{
      const tx = db.transaction(STORE,mode);
      const r = fn(tx.objectStore(STORE));
      let value: T;
      r.onsuccess = () => {value=r.result;};
      tx.oncomplete=()=>resolve(value);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error);
    });
  } finally { db.close(); }
}
export async function saveDocumentDraft(draft: DocumentDraft) {
  await transact("readwrite",s=>s.put(draft));
}
export async function loadDocumentDrafts(userId:string): Promise<DocumentDraft[]> {
  return transact("readonly",s=>s.index("userId").getAll(userId));
}
export async function removeDocumentDraft(id:string) {
  await transact("readwrite",s=>s.delete(id));
}
export async function clearDocumentDrafts(userId:string) {
  for (const draft of await loadDocumentDrafts(userId)) await removeDocumentDraft(draft.id);
}
