"use client";
/** Naturally idempotent offline operation: setting notification read_status=true. */
const DB_NAME = "barangay-notification-outbox-v1";
const STORE = "mark-read";
type PendingRead = { id: string; userId: string; createdAt: number };
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject)=>{
    const r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>{
      if(!r.result.objectStoreNames.contains(STORE)){
        const s=r.result.createObjectStore(STORE,{keyPath:"id"});
        s.createIndex("userId","userId");
      }
    };
    r.onsuccess=()=>resolve(r.result);
    r.onerror=()=>reject(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, call:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T> {
  const db=await open();
  try {
    return await new Promise<T>((resolve,reject)=>{
      const t=db.transaction(STORE,mode);const r=call(t.objectStore(STORE));let value:T;
      r.onsuccess=()=>{value=r.result;};
      t.oncomplete=()=>resolve(value);
      t.onerror=()=>reject(t.error);
      t.onabort=()=>reject(t.error);
    });
  } finally {db.close();}
}
export async function queueRead(userId:string, ids:string[]){
  for(const notificationId of ids) {
    const item:PendingRead={id:userId+":"+notificationId,userId,createdAt:Date.now()};
    await tx("readwrite",s=>s.put(item));
  }
}
export async function pendingReads(userId:string):Promise<PendingRead[]> {
  return tx("readonly",s=>s.index("userId").getAll(userId));
}
export async function clearReads(userId:string){
  for(const item of await pendingReads(userId)) await tx("readwrite",s=>s.delete(item.id));
}
export async function syncReads(supabase:any,userId:string):Promise<number>{
  if(!navigator.onLine)return 0;
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||user?.id!==userId)return 0;
  let sent=0;
  for(const item of await pendingReads(userId)){
    const id=item.id.slice(userId.length+1);
    const {error:writeError}=await supabase.from("notifications")
      .update({read_status:true}).eq("user_id",userId).eq("id",id);
    if(writeError)continue;
    await tx("readwrite",s=>s.delete(item.id));
    sent++;
  }
  return sent;
}
