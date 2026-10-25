"use client";
type Intent = { id: string; userId: string; programId: string; createdAt: number; attempts: number; state: "queued" | "needs_attention" };
const DB = "barangay-program-intents-v1", STORE = "intents";
function open(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB,1);
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
async function tx<T>(mode:IDBTransactionMode,fn:(s:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
 const db=await open();
 try {return await new Promise<T>((resolve,reject)=>{
  const t=db.transaction(STORE,mode),r=fn(t.objectStore(STORE));let result:T;
  r.onsuccess=()=>{result=r.result;};
  t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);
 });}finally{db.close();}
}
export async function queueProgramIntent(userId:string,programId:string){
 const item:Intent={id:userId+":"+programId,userId,programId,createdAt:Date.now(),attempts:0,state:"queued"};
 await tx("readwrite",s=>s.put(item));
}
export async function listProgramIntents(userId:string):Promise<Intent[]> {
 return tx("readonly",s=>s.index("userId").getAll(userId));
}
export async function clearProgramIntents(userId:string){
 for(const item of await listProgramIntents(userId))await tx("readwrite",s=>s.delete(item.id));
}
export async function syncProgramIntents(supabase:any,userId:string):Promise<{sent:number;failed:number}>{
 if(!navigator.onLine)return {sent:0,failed:0};
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||user?.id!==userId)return {sent:0,failed:0};
 const {data:resident}=await supabase.from("residents").select("id").eq("user_id",userId).maybeSingle();
 if(!resident)return {sent:0,failed:0};
 let sent=0,failed=0;
 for(const item of await listProgramIntents(userId)){
  if(item.state==="needs_attention")continue;
  // Server RPC is final authority on eligibility, deadlines, capacity and verification.
  const {error:applyError}=await supabase.rpc("apply_to_barangay_program",{p_program_id:item.programId});
  let confirmed=!applyError;
  if(applyError){
   const {data:existing,error:lookupError}=await supabase.from("program_enrollees")
     .select("id").eq("resident_id",resident.id).eq("program_id",item.programId).maybeSingle();
   confirmed=!lookupError&&!!existing;
  }
  if(confirmed){await tx("readwrite",s=>s.delete(item.id));sent++;}
  else {
   const permanent=applyError?.code==="42501"||applyError?.code==="23514"||applyError?.code==="P0001";
   await tx("readwrite",s=>s.put({...item,state:permanent?"needs_attention":"queued",attempts:item.attempts+1}));
   failed++;
  }
 }
 return {sent,failed};
}
