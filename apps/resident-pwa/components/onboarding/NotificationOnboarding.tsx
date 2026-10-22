"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function NotificationOnboarding() {
 const [visible,setVisible]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [choiceKey,setChoiceKey]=useState("");
 useEffect(()=>{
  if(!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window))return;
  const supabase=createClient();
  supabase.auth.getUser().then((result: { data: { user: { id: string } | null } })=>{
   const user=result.data.user;
   if(!user)return;
   const key="barangay-notification-choice:"+user.id;
   setChoiceKey(key);
   if(!localStorage.getItem(key) && Notification.permission==="default")setVisible(true);
  }).catch(()=>{});
 },[]);
 async function enable(){
  setBusy(true);setMessage("");
  try{
   if(!choiceKey)throw new Error("Sign in first.");
   const key=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
   if(!key)throw new Error("Notifications are not configured on this deployment.");
   if(await Notification.requestPermission()!=="granted")throw new Error("Permission was not granted. You can enable it later in Profile.");
   const registration=await navigator.serviceWorker.ready;
   const padded=(key+"=".repeat((4-key.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/");
   const bytes=Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
   let subscription=await registration.pushManager.getSubscription();
   const newlyCreated=!subscription;
   if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
   const response=await fetch("/api/notifications/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(subscription)});
   if(!response.ok){
    if(newlyCreated)await subscription.unsubscribe();
    throw new Error("Could not save this device subscription.");
   }
   localStorage.setItem(choiceKey,"enabled");setVisible(false);
  }catch(err){setMessage(err instanceof Error?err.message:"Unable to enable notifications.");}
  finally{setBusy(false);}
 }
 function skip(){if(choiceKey)localStorage.setItem(choiceKey,"later");setVisible(false);}
 if(!visible)return null;
 return <section className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3 text-left" aria-label="Notification permission onboarding">
  <h2 className="font-bold text-sm text-blue-900">Stay updated with Barangay notifications</h2>
  <p className="text-xs text-blue-800">Get account approval, document request and barangay advisory updates on your device. This is optional; you can still check updates inside the app.</p>
  {message&&<p role="alert" className="text-xs text-red-700">{message}</p>}
  <div className="flex gap-2">
   <button type="button" disabled={busy} onClick={()=>void enable()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy?"Enabling...":"Enable Notifications"}</button>
   <button type="button" disabled={busy} onClick={skip} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-800">Not now</button>
  </div>
 </section>;
}
