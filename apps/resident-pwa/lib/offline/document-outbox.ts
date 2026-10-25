"use client";
import { submitDocumentRequest } from "@/app/(app)/requests/actions";

export type QueuedDocument = {
  id: string; userId: string; documentTypeId: string; purpose: string;
  createdAt: number; attempts: number; nextRetryAt?: number;
  state: "queued" | "needs_attention";
};
const DB = "barangay-document-outbox-v1", STORE = "requests";
function open():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{
   if(!r.result.objectStoreNames.contains(STORE)){
    const s=r.result.createObjectStore(STORE,{keyPath:"id"});
    s.createIndex("userId","userId");
   }
  };
  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
 });
}
async function tx<T>(mode:IDBTransactionMode,fn:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await open();
 try{return await new Promise<T>((resolve,reject)=>{
  const t=db.transaction(STORE,mode),r=fn(t.objectStore(STORE));let value:T;
  r.onsuccess=()=>{value=r.result;};t.oncomplete=()=>resolve(value);
  t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
 });}finally{db.close();}
}
export async function listQueuedDocuments(userId:string):Promise<QueuedDocument[]>{
 return tx("readonly",s=>s.index("userId").getAll(userId));
}
export async function queueDocumentRequest(item:QueuedDocument){
 const items=await listQueuedDocuments(item.userId);
 if(items.length>=20&&!items.some(x=>x.id===item.id))throw new Error("Maximum of 20 pending document requests.");
 await tx("readwrite",s=>s.put(item));
}
export async function clearQueuedDocuments(userId:string){
 for(const item of await listQueuedDocuments(userId))await tx("readwrite",s=>s.delete(item.id));
}
export async function syncQueuedDocuments(supabase:any,userId:string):Promise<{sent:number;failed:number}>{
 if(!navigator.onLine)return {sent:0,failed:0};
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||user?.id!==userId)return {sent:0,failed:0};
 let sent=0,failed=0;
 for(const item of await listQueuedDocuments(userId)){
  if(item.state==="needs_attention"||(item.nextRetryAt&&item.nextRetryAt>Date.now()))continue;
  try{
   const form=new FormData();
   form.append("documentTypeId",item.documentTypeId);
   form.append("purpose",item.purpose);
   form.append("requirements","[]");
   form.append("clientOperationId",item.id);
   await submitDocumentRequest(form);
   await tx("readwrite",s=>s.delete(item.id));
   sent++;
  }catch(error){
   const message=error instanceof Error?error.message:"";
   const permanent=/requirements changed|not found|Unauthorized|Resident profile|Invalid/.test(message);
   await queueDocumentRequest({...item,attempts:item.attempts+1,
     state:permanent?"needs_attention":"queued",
     nextRetryAt:Date.now()+Math.min(15*60_000,30_000*2**Math.min(item.attempts,5))});
   failed++;
  }
 }
 return {sent,failed};
}
