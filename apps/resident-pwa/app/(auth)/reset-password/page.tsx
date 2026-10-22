"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [message,setMessage]=useState("");
 const [success,setSuccess]=useState(false);
 const [loading,setLoading]=useState(false);
 const [authenticated,setAuthenticated]=useState<boolean|null>(null);
 useEffect(()=>{
  const supabase=createClient();
  void supabase.auth.getUser().then(({data})=>setAuthenticated(Boolean(data?.user))).catch(()=>setAuthenticated(false));
 },[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();
  if(password.length<12){setMessage("Use at least 12 characters.");return;}
  if(password!==confirm){setMessage("Passwords do not match.");return;}
  setLoading(true);setMessage("");
  const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setMessage("This password reset session has expired. Request a new reset email.");setLoading(false);return;}
  const {error}=await supabase.auth.updateUser({password});
  if(error){setMessage(error.message);setLoading(false);return;}
  await supabase.auth.signOut();
  setSuccess(true);setLoading(false);setPassword("");setConfirm("");
 }
 return <main className="mx-auto max-w-md min-h-screen p-6 flex flex-col justify-center gap-4">
  <h1 className="text-xl font-bold">Reset your password</h1>
  <p className="text-sm text-gray-600">Choose a new password for your Barangay resident account. Use a unique password.</p>
  {authenticated===false&&<p role="alert" className="text-sm text-red-700">No active password-reset session. Request a new reset email from your account or login page.</p>}
  {success?<div className="rounded-xl border bg-emerald-50 p-4 space-y-3"><p className="text-sm text-emerald-800">Password updated. Sign in again with your new password.</p><Link href="/login" className="text-sm font-bold text-blue-700">Go to Sign In</Link></div>
  :<form onSubmit={submit} className="space-y-4">
   <label className="block text-sm font-semibold">New password
    <input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
   </label>
   <label className="block text-sm font-semibold">Confirm password
    <input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-lg border p-3"/>
   </label>
   {message&&<p role="alert" className="text-sm text-red-700">{message}</p>}
   <button disabled={loading||authenticated!==true} className="w-full rounded-lg bg-blue-600 text-white p-3 font-bold disabled:opacity-50">{loading?"Updating...":"Update password"}</button>
  </form>}
 </main>;
}
