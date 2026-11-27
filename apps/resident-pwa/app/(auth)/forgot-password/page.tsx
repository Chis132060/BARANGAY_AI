"use client";
import { useRef,useState,type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
export default function ForgotPasswordPage(){
 const [email,setEmail]=useState("");const [mode,setMode]=useState<"reset"|"confirm">("reset");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 const lock=useRef(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(lock.current)return;setError("");setMessage("");
  const address=email.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)||address.endsWith("@smartbarangay.local")){setError("Enter your real email address. For a resident code without email, contact barangay staff.");return;}
  lock.current=true;setBusy(true);
  try{
   const supabase=createClient();
   const callback=window.location.origin+"/auth/callback?next="+(mode==="reset"?"/reset-password":"/home");
   const result=mode==="reset"?await supabase.auth.resetPasswordForEmail(address,{redirectTo:callback}):await supabase.auth.resend({type:"signup",email:address,options:{emailRedirectTo:callback}});
   if(result.error && (result.error.status===429 || (result.error.status??0)>=500)){setError("Email service is temporarily unavailable or rate limited. Try again later.");return;}
   setMessage("If an eligible account exists, check your inbox and spam folder for the email. Open the link in this browser.");
  }catch{setError("Unable to reach the email service. Check your connection and try again.");}
  finally{lock.current=false;setBusy(false);}
 }
 return <main className="mx-auto flex min-h-[100dvh] max-w-lg items-center px-4 py-8"><section className="w-full space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
  <img src="/logo.png" alt="Smart Barangay Logo" className="mx-auto h-14 w-auto"/>
  <h1 className="text-2xl font-bold text-slate-900">Account recovery</h1>
  <p className="text-sm text-slate-600">Reset a forgotten password or resend your registration email.</p>
  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Recovery type">
   <button type="button" disabled={busy} aria-pressed={mode==="reset"} onClick={()=>{setMode("reset");setMessage("");setError("");}} className={"min-h-12 rounded-xl border px-2 text-sm font-semibold "+(mode==="reset"?"bg-blue-50 border-blue-600 text-blue-800":"border-slate-300")}>Reset password</button>
   <button type="button" disabled={busy} aria-pressed={mode==="confirm"} onClick={()=>{setMode("confirm");setMessage("");setError("");}} className={"min-h-12 rounded-xl border px-2 text-sm font-semibold "+(mode==="confirm"?"bg-blue-50 border-blue-600 text-blue-800":"border-slate-300")}>Confirm email</button>
  </div>
  <form noValidate onSubmit={submit} className="space-y-4">
   <label htmlFor="recovery-email" className="block text-sm font-semibold">Registered email address</label>
   <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 p-3 text-base" aria-invalid={Boolean(error)} required/>
   {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
   <button disabled={busy} className="min-h-12 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?"Sending…":mode==="reset"?"Send reset email":"Resend confirmation email"}</button>
  </form>
  <p className="text-sm text-slate-600">No access to your email, or using a Resident Code without email? Contact the barangay office for identity-verified account recovery. Staff must never ask for your current password.</p>
  <Link href="/login" className="block text-sm font-semibold text-blue-700">Back to sign in</Link>
 </section></main>;
}
