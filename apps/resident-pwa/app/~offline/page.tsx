"use client";
import { useEffect, useState } from "react";
import { loadPublicSnapshot } from "@/lib/offline/public-snapshots";
import { listTickets } from "@/lib/offline/support-outbox";
import { loadDocumentDrafts } from "@/lib/offline/document-drafts";
import { createClient } from "@/lib/supabase/client";

type PublicNotice = { id:string; title:string; description:string };
export default function OfflinePage() {
  const [notices,setNotices] = useState<PublicNotice[]>([]);
  const [programs,setPrograms] = useState<Array<{id:string;name:string;description:string|null}>>([]);
  const [organizations,setOrganizations] = useState<Array<{id:string;name:string;description:string|null}>>([]);
  const [draftCount,setDraftCount] = useState<number | null>(null);
  const [ticketCount,setTicketCount] = useState<number | null>(null);
  const [lastUpdated,setLastUpdated] = useState<number | null>(null);
  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const snapshot = await loadPublicSnapshot<PublicNotice[]>("announcements");
        const [programSnapshot, organizationSnapshot] = await Promise.all([
          loadPublicSnapshot<Array<{id:string;name:string;description:string|null}>>("barangay-programs"),
          loadPublicSnapshot<Array<{id:string;name:string;description:string|null}>>("barangay-organizations"),
        ]);
        if (mounted && programSnapshot) setPrograms(programSnapshot.data.slice(0,5));
        if (mounted && organizationSnapshot) setOrganizations(organizationSnapshot.data.slice(0,5));
        if (mounted && snapshot) {
          setNotices(snapshot.data.slice(0,5));
          setLastUpdated(snapshot.cachedAt);
        }
      } catch { /* unsupported local storage */ }
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted || !session?.user?.id) return;
        const [drafts,tickets] = await Promise.all([
          loadDocumentDrafts(session.user.id), listTickets(session.user.id),
        ]);
        if (mounted) {setDraftCount(drafts.length);setTicketCount(tickets.length);}
      } catch { /* no local session or storage */ }
    })();
    return () => { mounted = false; };
  },[]);
  return <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
    <section className="mx-auto w-full max-w-md rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200 space-y-5">
      <img src="/logo.png" alt="Smart Barangay" className="h-14 w-auto object-contain"/>
      <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Offline mode</p>
        <h1 className="mt-2 text-2xl font-bold">No connection right now</h1>
        <p className="mt-2 text-sm text-slate-600">Saved content may be outdated. Local drafts and queued tickets are NOT yet submitted to the barangay.</p>
      </div>
      {draftCount!==null&&<p className="rounded-xl bg-amber-50 p-3 text-sm">Document drafts on this device: <strong>{draftCount}</strong></p>}
      {ticketCount!==null&&<p className="rounded-xl bg-amber-50 p-3 text-sm">Support tickets waiting to sync: <strong>{ticketCount}</strong></p>}
      <section className="space-y-2">
        <h2 className="text-sm font-bold">Previously saved public announcements</h2>
        {lastUpdated&&<p className="text-xs text-slate-500">Last saved: {new Date(lastUpdated).toLocaleString()}</p>}
        {notices.length ? notices.map(n=><article key={n.id} className="rounded-lg border p-3">
          <h3 className="font-semibold text-sm">{n.title}</h3>
          <p className="text-xs text-slate-600 mt-1">{n.description}</p>
        </article>) : <p className="text-xs text-slate-500">No saved announcements. Open announcements while connected to download them.</p>}
      </section>
      {programs.length > 0 && <section className="space-y-2"><h2 className="text-sm font-bold">Saved barangay programs</h2>{programs.map(p=><article key={p.id} className="rounded-lg border p-3"><h3 className="text-sm font-semibold">{p.name}</h3>{p.description&&<p className="mt-1 text-xs text-slate-600">{p.description}</p>}</article>)}</section>}
      {organizations.length > 0 && <section className="space-y-2"><h2 className="text-sm font-bold">Saved barangay organizations</h2>{organizations.map(o=><article key={o.id} className="rounded-lg border p-3"><h3 className="text-sm font-semibold">{o.name}</h3>{o.description&&<p className="mt-1 text-xs text-slate-600">{o.description}</p>}</article>)}</section>}
      <button type="button" onClick={()=>window.location.reload()}
        className="min-h-12 w-full rounded-2xl bg-blue-700 px-5 text-sm font-bold text-white">Retry connection</button>
    </section>
  </main>;
}
