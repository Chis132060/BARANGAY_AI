"use client";
import { useState } from "react";
import { updateSupportTicket, type TicketStatus } from "./actions";

type Ticket={id:string;resident_user_id:string;category:string;subject:string;description:string;status:string;staff_reply:string|null;created_at:string;updated_at:string};
const statuses:TicketStatus[]=["Submitted","In Review","Resolved","Closed"];
export function SupportTicketsClient({initialTickets}:{initialTickets:Ticket[]}) {
 const [tickets,setTickets]=useState(initialTickets);
 const [editing,setEditing]=useState<Record<string,{status:TicketStatus;reply:string}>>({});
 const [busy,setBusy]=useState<string|null>(null);
 const [message,setMessage]=useState("");
 async function save(ticket:Ticket) {
  const form=editing[ticket.id]||{status:ticket.status as TicketStatus,reply:ticket.staff_reply||""};
  setBusy(ticket.id);setMessage("");
  try {
   const result=await updateSupportTicket(ticket.id,form.status,form.reply);
   setTickets(prev=>prev.map(t=>t.id===ticket.id?{...t,status:form.status,staff_reply:form.reply}:t));
   setMessage(result.notificationSent?"Ticket updated and resident notified.":"Ticket updated. Notification delivery failed; please follow up.");
  } catch(err) {setMessage(err instanceof Error?err.message:"Ticket update failed.");}
  finally{setBusy(null);}
 }
 return <div className="space-y-4">
  <p className="text-sm text-muted-foreground">{tickets.length} recent tickets. Review resident concerns and send replies.</p>
  {message&&<div role="status" className="rounded-lg border p-3 text-sm">{message}</div>}
  {tickets.length===0&&<p className="rounded-lg border p-8 text-center text-sm">No resident support tickets yet.</p>}
  {tickets.map(t=>{
   const form=editing[t.id]||{status:t.status as TicketStatus,reply:t.staff_reply||""};
   return <article key={t.id} className="rounded-xl border bg-card p-4 space-y-3">
    <header className="flex flex-wrap justify-between gap-2">
     <div><h2 className="font-semibold">{t.subject}</h2><p className="text-xs text-muted-foreground">{t.category} • {new Date(t.created_at).toLocaleString()} • Ticket {t.id.slice(0,8)}</p></div>
     <span className="text-xs font-semibold rounded-full border px-3 py-1">{t.status}</span>
    </header>
    <p className="text-sm whitespace-pre-wrap break-words">{t.description}</p>
    <div className="flex flex-col sm:flex-row gap-3">
      <label className="text-sm space-y-1 sm:w-48"><span className="block font-medium">Status</span>
       <select className="w-full rounded-md border bg-background p-2" value={form.status}
        onChange={e=>setEditing(prev=>({...prev,[t.id]:{...form,status:e.target.value as TicketStatus}}))}>
        {statuses.map(st=><option key={st} value={st}>{st}</option>)}
       </select>
      </label>
      <label className="text-sm space-y-1 flex-1"><span className="block font-medium">Reply to resident</span>
       <textarea className="w-full rounded-md border bg-background p-2" rows={3} maxLength={4000}
        value={form.reply} placeholder="Write a useful response (visible to resident)"
        onChange={e=>setEditing(prev=>({...prev,[t.id]:{...form,reply:e.target.value}}))}/>
      </label>
    </div>
    <button type="button" onClick={()=>void save(t)} disabled={busy!==null}
     className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-50">
     {busy===t.id?"Saving...":"Save & notify resident"}
    </button>
   </article>;
  })}
 </div>;
}
