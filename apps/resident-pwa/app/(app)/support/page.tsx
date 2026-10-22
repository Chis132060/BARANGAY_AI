"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
type Ticket={id:string;category:string;subject:string;description:string;status:string;staff_reply:string|null;created_at:string};
const categories=["Account","Documents","Technical","Privacy","Other"] as const;
export default function ResidentSupportPage() {
 const [tickets,setTickets]=useState<Ticket[]>([]);
 const [category,setCategory]=useState<(typeof categories)[number]>("Account");
 const [subject,setSubject]=useState("");
 const [description,setDescription]=useState("");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const supabase=createClient();
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const category=params.get("category");if(category==="Privacy")setCategory("Privacy");const requestedSubject=params.get("subject");if(requestedSubject)setSubject(requestedSubject.slice(0,160));},[]);
 async function refresh(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setError("Sign in to submit a ticket.");setLoading(false);return;}
  const {data,error:loadError}=await supabase.from("support_tickets")
   .select("id,category,subject,description,status,staff_reply,created_at")
   .eq("resident_user_id",user.id).order("created_at",{ascending:false}).limit(50);
  if(loadError)setError("Could not load ticket history.");
  else setTickets((data||[]) as Ticket[]);
  setLoading(false);
 }
 useEffect(()=>{void refresh();},[]);
 async function submit(event:React.FormEvent){
  event.preventDefault();
  if(subject.trim().length<5||description.trim().length<10){setError("Enter a subject and at least 10 characters of details.");return;}
  setBusy(true);setError("");
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user)throw new Error("Sign in first.");
   const {error:insertError}=await supabase.from("support_tickets").insert({
    resident_user_id:user.id,category,subject:subject.trim(),description:description.trim()
   });
   if(insertError)throw new Error("Could not submit ticket. Try again or contact the barangay office.");
   setSubject("");setDescription("");await refresh();
  }catch(err){setError(err instanceof Error?err.message:"Ticket submission failed.");}
  finally{setBusy(false);}
 }
 return <main className="space-y-6 p-4 pb-24">
  <header><Link href="/profile" className="text-sm text-blue-600">← Profile</Link>
   <h1 className="text-xl font-bold mt-2">Help & Support Tickets</h1>
   <p className="text-sm text-gray-600">Report an issue to barangay staff. Never include passwords or verification codes.</p></header>
  <section className="rounded-xl border bg-white p-4 space-y-3">
   <h2 className="font-semibold">Frequently asked questions</h2>
   <details className="text-sm border-b pb-2"><summary className="cursor-pointer font-medium">How do I verify my account?</summary><p className="mt-2 text-gray-600">After registration, wait for the barangay staff to review your application. Check the Pending Approval page to see your status.</p></details>
   <details className="text-sm border-b pb-2"><summary className="cursor-pointer font-medium">How do I track my document request?</summary><p className="mt-2 text-gray-600">Open My Requests to see its status. <Link href="/requests" className="text-blue-700 underline">View requests</Link></p></details>
   <details className="text-sm border-b pb-2"><summary className="cursor-pointer font-medium">What if my account is rejected?</summary><p className="mt-2 text-gray-600">Check the rejection reason and open a support ticket so staff can advise on the next steps.</p></details>
   <details className="text-sm"><summary className="cursor-pointer font-medium">How do I protect my data?</summary><p className="mt-2 text-gray-600">Do not share passwords or OTP codes. For access or closure requests, choose Privacy as your ticket category.</p></details>
   <Link href="/chat" className="block text-center rounded-lg border border-blue-200 p-3 text-sm text-blue-700 font-semibold">Ask AI Assistant</Link>
  </section>
  <form onSubmit={submit} className="rounded-xl border p-4 space-y-3 bg-white">
   <h2 className="font-semibold">New support ticket</h2>
   <label className="block text-sm">Concern category
    <select value={category} onChange={e=>setCategory(e.target.value as typeof category)} className="block border rounded-lg p-2 w-full mt-1">
     {categories.map(c=><option key={c} value={c}>{c}</option>)}
    </select>
   </label>
   <label className="block text-sm">Subject
    <input required minLength={5} maxLength={160} value={subject} onChange={e=>setSubject(e.target.value)} className="block border rounded-lg p-2 w-full mt-1"/>
   </label>
   <label className="block text-sm">Details
    <textarea required minLength={10} maxLength={4000} rows={4} value={description} onChange={e=>setDescription(e.target.value)} className="block border rounded-lg p-2 w-full mt-1"/>
   </label>
   <button disabled={busy} className="rounded-lg bg-blue-600 text-white font-semibold text-sm p-3 w-full disabled:opacity-60">{busy?"Submitting...":"Submit ticket"}</button>
  </form>
  {error&&<p role="alert" className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</p>}
  <section className="space-y-3"><h2 className="font-semibold">My tickets</h2>
   {loading&&<p className="text-sm">Loading...</p>}
   {!loading&&tickets.length===0&&<p className="text-sm text-gray-500">No support tickets yet.</p>}
   {tickets.map(t=><article key={t.id} className="rounded-xl border bg-white p-4 space-y-2">
    <div className="flex justify-between gap-3"><strong>{t.subject}</strong><span className="text-xs text-blue-700">{t.status}</span></div>
    <p className="text-xs text-gray-500">{t.category} • {new Date(t.created_at).toLocaleString()}</p>
    <p className="text-sm whitespace-pre-wrap break-words">{t.description}</p>
    {t.staff_reply&&<div className="rounded-lg bg-blue-50 p-3"><p className="text-xs font-bold text-blue-700">Barangay staff reply</p><p className="text-sm whitespace-pre-wrap break-words">{t.staff_reply}</p></div>}
   </article>)}
  </section>
 </main>;
}
