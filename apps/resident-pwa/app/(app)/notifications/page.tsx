"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notice={id:string;title:string;message:string;created_at:string;read_status:boolean};
export default function NotificationsPage(){
 const [notices,setNotices]=useState<Notice[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [supabase] = useState(() => createClient());
 const load=useCallback(async()=>{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError("Sign in to view notifications.");setLoading(false);return;}
   const {data,error:fetchError}=await supabase.from("notifications")
    .select("id,title,message,created_at,read_status")
    .eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
   if(fetchError)setError("Could not load notifications.");
   else {setNotices((data||[]) as Notice[]);setError("");}
   setLoading(false);
 },[supabase]);
 useEffect(()=>{
   void load();
   const channel=supabase.channel("resident-notification-center")
    .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},()=>{void load();})
    .subscribe();
   return ()=>{void supabase.removeChannel(channel);};
 },[load,supabase]);
 async function markRead(ids:string[]){
   if(!ids.length)return;
   setBusy(true);setError("");
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){setError("Sign in first.");setBusy(false);return;}
   const {error:updateError}=await supabase.from("notifications").update({read_status:true})
    .eq("user_id",user.id).in("id",ids);
   if(updateError)setError("Could not update notifications.");
   else setNotices(prev=>prev.map(n=>ids.includes(n.id)?{...n,read_status:true}:n));
   setBusy(false);
 }
 const unread=notices.filter(n=>!n.read_status);
 return <main className="space-y-4 p-4 pb-24">
  <header><Link href="/profile" className="text-blue-600 text-sm">← Profile</Link>
   <div className="flex justify-between items-center gap-3 mt-2">
    <div><h1 className="text-xl font-bold">Notifications</h1><p className="text-sm text-gray-500">{unread.length} unread</p></div>
    <button type="button" className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50" disabled={busy||unread.length===0}
     onClick={()=>void markRead(unread.map(n=>n.id))}>Mark all as read</button>
   </div>
  </header>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {loading&&<p className="text-sm">Loading notifications...</p>}
  {!loading&&notices.length===0&&<p className="text-sm text-gray-500 rounded-xl border p-5">No notifications yet.</p>}
  {notices.map(n=><article key={n.id} className={"rounded-xl border p-4 space-y-2 "+(n.read_status?"bg-white":"bg-blue-50")}>
   <div className="flex justify-between gap-2"><h2 className="font-semibold text-sm">{n.title}</h2>{!n.read_status&&<span className="text-xs text-blue-700">New</span>}</div>
   <p className="text-sm whitespace-pre-wrap break-words">{n.message}</p>
   <div className="flex justify-between items-center"><span className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
   {!n.read_status&&<button type="button" disabled={busy} onClick={()=>void markRead([n.id])} className="text-xs text-blue-700 font-semibold">Mark read</button>}</div>
  </article>)}
 </main>;
}
