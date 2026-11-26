"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode, type InputHTMLAttributes } from "react";
import { User, MapPin, KeyRound, FileCheck, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Camera, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { registerResidentAction } from "@/app/(auth)/register/actions";
import CameraCapture from "../camera/CameraCapture";

const { registrationFieldErrors, validateIdFile, PASSWORD_MIN, PASSWORD_MAX } = require("../../lib/registration-validation.cjs") as {
  registrationFieldErrors: (data: Record<string, unknown>, step?: number) => Record<string, string>;
  validateIdFile: (file: {type:string;size:number}) => string[];
  PASSWORD_MIN: number; PASSWORD_MAX: number;
};
const PUROK_OPTIONS = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 7"];
const ID_TYPE_OPTIONS = [
  "Philippine Identification (PhilID / ePhilID)", "Voter's ID / Voter's Certification", "Driver's License",
  "UMID / SSS / GSIS Card", "Postal ID", "Barangay Clearance / Proof of Residency",
];
const initial = { firstName:"", middleName:"", lastName:"", birthDate:"", gender:"Male", contactNumber:"",
  houseNumber:"", street:"", purok:"Purok 1", householdCode:"", email:"", password:"", idType:ID_TYPE_OPTIONS[0] };
type FieldName = keyof typeof initial;
const steps = [
  {label:"Personal", title:"Personal information", description:"Enter your details as shown on your identification.", icon:User},
  {label:"Address", title:"Residency address", description:"Tell us where you live in the barangay.", icon:MapPin},
  {label:"Account", title:"Account information", description:"Create the credentials you will use to sign in.", icon:KeyRound},
  {label:"Identification", title:"Identification", description:"Capture a clear photo of your identification for staff review.", icon:FileCheck},
];
const control = "min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:opacity-60";
const primary = "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50";
function Field({name,label,error,hint,children}: {name:string;label:string;error?:string;hint?:string;children:ReactNode}){
  return <div className="min-w-0 space-y-1.5"><label htmlFor={name} className="block text-sm font-semibold text-slate-800">{label}</label>{children}
    {hint && <p id={name+"-hint"} className="text-sm leading-relaxed text-slate-600">{hint}</p>}
    {error && <p id={name+"-error"} role="alert" className="text-sm font-medium text-red-700">{error}</p>}</div>;
}

export function RegisterForm() {
  const [step,setStep]=useState(1);
  const [formData,setFormData]=useState(initial);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [errorMsg,setErrorMsg]=useState("");
  const [loading,setLoading]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [emailWarning,setEmailWarning]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [capturedBlob,setCapturedBlob]=useState<Blob|null>(null);
  const [preview,setPreview]=useState("");
  const [isCapturing,setIsCapturing]=useState(false);
  const locked=useRef(false);
  const heading=useRef<HTMLHeadingElement>(null);
  const firstRender=useRef(true);
  const dirty=Object.keys(initial).some(k=>formData[k as FieldName]!==initial[k as FieldName]) || Boolean(capturedBlob);
  useEffect(()=>{
    if(firstRender.current){firstRender.current=false;return;}
    heading.current?.focus();
  },[step]);
  useEffect(()=>{
    if(!capturedBlob){setPreview("");return;}
    const url=URL.createObjectURL(capturedBlob);setPreview(url);
    return ()=>URL.revokeObjectURL(url);
  },[capturedBlob]);
  useEffect(()=>{
    if(!dirty||submitted)return;
    const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
    window.addEventListener("beforeunload",warn);
    return ()=>window.removeEventListener("beforeunload",warn);
  },[dirty,submitted]);
  function change(name:FieldName,value:string){
    setFormData(prev=>({...prev,[name]:value}));
    setErrors(prev=>{const next={...prev};delete next[name];return next;});
    setErrorMsg("");
  }
  function input(name:FieldName,label:string,props:InputHTMLAttributes<HTMLInputElement>={},hint?:string){
    return <Field name={name} label={label} error={errors[name]} hint={hint}>
      <input {...props} id={name} name={name} value={formData[name]} onChange={e=>change(name,e.target.value)}
        aria-invalid={Boolean(errors[name])} aria-describedby={[hint?name+"-hint":"",errors[name]?name+"-error":""].filter(Boolean).join(" ")||undefined}
        className={control+(errors[name]?" border-red-600":"")} />
    </Field>;
  }
  function select(name:FieldName,label:string,options:string[]){
    return <Field name={name} label={label} error={errors[name]}><select id={name} name={name} value={formData[name]} onChange={e=>change(name,e.target.value)} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name]?name+"-error":undefined} className={control}>{options.map(v=><option key={v} value={v}>{v}</option>)}</select></Field>;
  }
  function validate(n:number){
    const result=registrationFieldErrors(formData,n);
    if(n===4){
      if(!capturedBlob)result.idBlob="Capture your identification photo before submitting.";
      else if(validateIdFile(capturedBlob).length)result.idBlob="Capture a JPEG, PNG or WEBP image of up to 4 MB.";
    }
    return result;
  }
  function reveal(n:number,issues:Record<string,string>){
    setStep(n);setErrors(issues);
    requestAnimationFrame(()=>document.getElementById(Object.keys(issues)[0])?.focus());
  }
  async function handleRegisterSubmit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(locked.current||submitted)return;
    setErrorMsg("");
    if(step<4){
      const issues=validate(step);
      if(Object.keys(issues).length){reveal(step,issues);return;}
      setErrors({});setStep(step+1);return;
    }
    for(let n=1;n<=4;n++){const issues=validate(n);if(Object.keys(issues).length){reveal(n,issues);return;}}
    if(!capturedBlob)return;
    locked.current=true;setLoading(true);
    try{
      const payload=new FormData();
      Object.entries(formData).forEach(([key,value])=>payload.append(key,value));
      payload.append("idBlob",capturedBlob,"id_capture.jpg");
      const res=await registerResidentAction(payload);
      if(res.fieldErrors){
        for(let n=1;n<=4;n++){
          const keys=[["firstName","middleName","lastName","birthDate","gender","contactNumber"],["purok","street","houseNumber","householdCode"],["email","password"],["idType","idBlob"]][n-1];
          const matches=Object.fromEntries(Object.entries(res.fieldErrors).filter(([key])=>keys.includes(key)|| (n===4&&key==="idBlob") || (n===2&&key==="householdCode")));
          if(Object.keys(matches).length){reveal(n,matches);return;}
        }
      }
      if(!res.success){setErrorMsg(res.error||"Registration could not be completed. Please try again.");return;}
      setEmailWarning(res.emailWarning||"");setFormData(prev=>({...prev,password:""}));setCapturedBlob(null);setSubmitted(true);
    }catch{setErrorMsg("Unable to submit registration. Your information is still here. Check your connection and retry.");}
    finally{locked.current=false;setLoading(false);}
  }
  if(submitted)return <section className="space-y-4 text-center" aria-live="polite">
    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600"/>
    <h2 className="text-2xl font-bold text-slate-900">Registration submitted</h2>
    <p className="text-sm leading-relaxed text-slate-600">Your application for {formData.firstName} {formData.lastName} is pending barangay verification. Confirm your email before signing in to check your status.</p>
    {emailWarning&&<p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{emailWarning}</p>}
    <a href="/login" className={primary}>Go to sign in <ArrowRight className="h-4 w-4"/></a>
  </section>;
  return <div className="min-w-0 space-y-6" data-registration-step={step}>
    <ol aria-label="Registration progress" className="grid grid-cols-4 gap-1 border-b border-slate-200 pb-5 sm:gap-3">
      {steps.map((item,i)=>{const Icon=item.icon;const active=step===i+1;return <li key={item.label} aria-current={active?"step":undefined} className="flex min-w-0 flex-col items-center gap-2 text-center">
        <span className={"flex h-10 w-10 items-center justify-center rounded-full border "+(active?"border-blue-600 bg-blue-600 text-white":step>i+1?"border-blue-200 bg-blue-50 text-blue-700":"border-slate-200 bg-slate-50 text-slate-500")}>{step>i+1?<CheckCircle2 className="h-5 w-5"/>:<Icon className="h-5 w-5"/>}</span>
        <span className={"text-xs font-semibold leading-tight sm:text-sm "+(active?"text-blue-700":"text-slate-600")}>{i+1}. {item.label}</span>
      </li>})}
    </ol>
    <form noValidate onSubmit={handleRegisterSubmit} className="space-y-5">
      <div className="space-y-1"><p className="text-sm font-semibold text-blue-700">Step {step} of 4</p><h2 ref={heading} tabIndex={-1} className="text-xl font-bold text-slate-900 outline-none sm:text-2xl">{steps[step-1].title}</h2><p className="text-sm leading-relaxed text-slate-600">{steps[step-1].description}</p><p className="text-sm text-slate-600">* Required fields</p></div>
      {errorMsg&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMsg}</p>}
      {step===1&&<div className="space-y-4">
        {input("firstName","First name *",{required:true,autoComplete:"given-name",maxLength:80})}
        <div className="grid gap-4 sm:grid-cols-2">{input("middleName","Middle name",{autoComplete:"additional-name",maxLength:80})}{input("lastName","Last name *",{required:true,autoComplete:"family-name",maxLength:80})}</div>
        <div className="grid gap-4 sm:grid-cols-2">{input("birthDate","Date of birth *",{type:"date",required:true,autoComplete:"bday",min:"1900-01-01",max:new Date().toISOString().slice(0,10)})}{select("gender","Gender",["Male","Female"])}</div>
        {input("contactNumber","Mobile number *",{type:"tel",required:true,autoComplete:"tel",maxLength:11,placeholder:"09XXXXXXXXX"},"11-digit Philippine mobile number.")}
      </div>}
      {step===2&&<div className="space-y-4">
        <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed text-blue-900">Residency requirement: at least six months in the barangay, subject to staff verification.</p>
        {select("purok","Purok / Zone *",PUROK_OPTIONS)}
        {input("street","Street name *",{required:true,autoComplete:"address-line1",maxLength:150})}
        {input("houseNumber","House / Lot number",{autoComplete:"address-line2",maxLength:80})}
        {input("householdCode","Household code (optional)",{maxLength:80},"Ask your household head or barangay staff if you already have a family record.")}
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">Boarders and renters: arrange RBI profiling with barangay staff. This online form does not save RBI files or boarder counts.</p>
      </div>}
      {step===3&&<div className="space-y-4">
        {input("email","Email address *",{type:"email",required:true,autoComplete:"email",maxLength:254,placeholder:"you@example.com"},"Use an email you can access for confirmation and password recovery.")}
        <Field name="password" label="Password *" error={errors.password} hint="Use 12–128 characters. Choose a unique password or passphrase.">
          <div className="relative"><input id="password" name="password" type={showPassword?"text":"password"} required autoComplete="new-password" minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} value={formData.password} onChange={e=>change("password",e.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={"password-hint"+(errors.password?" password-error":"")} className={control+" pr-14"}/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-600">{showPassword?<EyeOff className="h-5 w-5"/>:<Eye className="h-5 w-5"/>}</button></div>
        </Field>
      </div>}
      {step===4&&<div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><ShieldCheck className="h-5 w-5 shrink-0"/><div><p className="font-semibold">Account information completed</p><p className="break-all">{formData.email}</p><p>Password retained securely for this submission.</p></div></div>
        {select("idType","Identification type *",ID_TYPE_OPTIONS)}
        <Field name="idBlob" label="Identification photo *" error={errors.idBlob} hint="Use a clear, readable photo. Maximum 4 MB.">
          <div className="space-y-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            {isCapturing?<CameraCapture onCapture={blob=>{const issues=validateIdFile(blob);if(issues.length){setErrors(prev=>({...prev,idBlob:"Capture an image of up to 4 MB."}));setIsCapturing(false);return;}setCapturedBlob(blob);setIsCapturing(false);setErrors(prev=>{const next={...prev};delete next.idBlob;return next;});}} onCancel={()=>setIsCapturing(false)}/>:<>
              {preview&&<img src={preview} alt="ID Preview" className="mx-auto max-h-56 w-full rounded-lg object-contain"/>}
              <button id="idBlob" type="button" disabled={loading} onClick={()=>setIsCapturing(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Camera className="h-5 w-5"/>{preview?"Retake ID Photo":"Start Camera"}</button>
            </>}
          </div>
        </Field>
        <p className="text-sm leading-relaxed text-slate-600">Your application remains pending until reviewed. Do not refresh this page: for privacy, identification images and passwords are not stored as browser drafts.</p>
      </div>}
      <div className="flex gap-3 border-t border-slate-200 pt-5">
        {step>1&&<button type="button" disabled={loading} onClick={()=>{setIsCapturing(false);setStep(step-1);setErrors({});setErrorMsg("");}} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><ArrowLeft className="h-4 w-4"/>Back</button>}
        <button type="submit" disabled={loading||isCapturing} className={primary}>{loading?<><Loader2 className="h-4 w-4 animate-spin"/>Submitting…</>:step===4?"Submit Registration":<>{["Next: Residency Address","Next: Account Info","Next: Upload Valid ID"][step-1]}<ArrowRight className="h-4 w-4"/></>}</button>
      </div>
    </form>
  </div>;
}
