"use client";
import { useState } from "react";
import type { JoinApplication } from "./actions";
import { reviewJoinApplication } from "./actions";

export function JoinRequestsClient({initialRequests}: {initialRequests: JoinApplication[]}) {
  const [requests,setRequests] = useState(initialRequests);
  const [notes,setNotes] = useState<Record<string,string>>({});
  const [busy,setBusy] = useState<string|null>(null);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");

  async function review(id:string,status:"Approved"|"Rejected") {
    setError("");setNotice("");setBusy(id);
    try {
      await reviewJoinApplication(id,status,notes[id]||"");
      setRequests(old=>old.map(item=>item.id===id?{...item,status,reason:notes[id]||""}:item));
      setNotice(status==="Approved"
        ?"Membership approved; the resident is now in the organization's member registry."
        :"Application rejected; status updated for the resident.");
    } catch(e) { setError(e instanceof Error?e.message:"Review failed"); }
    finally {setBusy(null);}
  }

  return <div className="space-y-4">
    {notice&&<p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    {requests.length===0&&<p className="rounded-xl border bg-white p-6 text-sm text-slate-600">No membership applications yet. Historic / On Hold organizations cannot receive new applications.</p>}
    {requests.map(item=><article key={item.id} className="space-y-3 rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{item.organization?.name||"Organization"}</h2>
          <p className="text-sm text-slate-700">{item.resident?item.resident.first_name+" "+item.resident.last_name:"Resident"} — {item.resident?.verification_status||"Verification unknown"}</p>
          <p className="mt-1 text-xs text-slate-500">Applied {new Date(item.created_at).toLocaleDateString("en-PH")}</p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900">{item.status}</span>
      </div>
      {item.status==="Pending"&&<div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-800">Review note (required if rejecting)
          <textarea value={notes[item.id]||""} maxLength={500} onChange={e=>setNotes(prev=>({...prev,[item.id]:e.target.value}))}
            rows={2} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 text-base" placeholder="Reason or additional verification"/>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy!==null || item.resident?.verification_status!=="Verified"} onClick={()=>void review(item.id,"Approved")}
            className="min-h-12 rounded-xl bg-green-700 px-5 py-3 text-base font-semibold text-white disabled:opacity-50">
            {busy===item.id?"Saving…":"Approve and Add Member"}
          </button>
          <button type="button" disabled={busy!==null || !notes[item.id]?.trim()} onClick={()=>void review(item.id,"Rejected")}
            className="min-h-12 rounded-xl bg-red-700 px-5 py-3 text-base font-semibold text-white disabled:opacity-50">
            Reject with Reason
          </button>
        </div>
        <p className="text-xs text-slate-600">Check the actual resident account, group eligibility, and organization's active status before approval.</p>
      </div>}
      {item.status!=="Pending"&&item.reason&&<p className="text-sm text-slate-700">Staff note: {item.reason}</p>}
    </article>)}
  </div>;
}
