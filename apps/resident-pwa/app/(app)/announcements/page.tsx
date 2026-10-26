"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Megaphone, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadPublicSnapshot, savePublicSnapshot } from "@/lib/offline/public-snapshots";
import { queueProgramIntent, listProgramIntents } from "@/lib/offline/program-intents";

interface Announcement {
  id: string; title: string; description: string; category: string; created_at: string; event_start_at: string | null; event_end_at: string | null; venue: string | null;
}
interface PublicOrganization { id: string; name: string; description: string | null; org_type: string; president: string | null; contact: string | null; }
interface Program {
  id: string; name: string; description: string | null; category: string; status: string; image_url: string | null;
  purok: string | null; venue: string | null; schedule_details: string | null;
  requirements: string | null; registration_open: boolean;
  registration_deadline: string | null; registration_opens_at: string | null; event_start_at: string | null; event_end_at: string | null; max_participants: number | null; min_age: number | null; max_age: number | null;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [applications, setApplications] = useState<Record<string, string>>({});
  const [offlineProgramIds, setOfflineProgramIds] = useState<string[]>([]);
  const [applicationDetails, setApplicationDetails] = useState<Array<{program_id:string;status:string;rejection_reason:string|null;created_at:string}>>([]);
  const [showMyApplications, setShowMyApplications] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"programs" | "organizations" | "announcements">("programs");
  const lastLoadAt = useRef(0);
  const inFlight = useRef(false);
  const reloadRequested = useRef(false);
  const announcementsRef = useRef<Announcement[]>([]);
  const programsRef = useRef<Program[]>([]);

  async function joinProgram(programId: string) {
    if (applying || applications[programId]) return;
    setApplying(programId);
    setApplyMessage("");
    try {
      const supabase = createClient();
      if (!navigator.onLine) {
        const {data:{session}}=await supabase.auth.getSession();
        if(!session?.user?.id)throw new Error("Sign in before saving an offline program application.");
        await queueProgramIntent(session.user.id,programId);
        setOfflineProgramIds(prev=>Array.from(new Set([...prev,programId])));
        setApplyMessage("Program application saved on this device — NOT submitted or a reserved slot. Eligibility and deadlines will be checked when online.");
        return;
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in before applying.");
      const { error } = await supabase.rpc("apply_to_barangay_program", { p_program_id: programId });
      if (error) throw error;
      setApplications((prev) => ({ ...prev, [programId]: "Pending" }));
      setApplyMessage("Application submitted. Await barangay review.");
    } catch (error) {
      setApplyMessage(error instanceof Error ? error.message : "Unable to submit application.");
    } finally {
      setApplying(null);
    }
  }

  useEffect(() => {
    const client=createClient();
    async function refreshOffline(){
      try{
        const {data:{session}}=await client.auth.getSession();
        if(session?.user?.id){
          const queued=await listProgramIntents(session.user.id);
          setOfflineProgramIds(queued.map(x=>x.programId));
        }
      }catch{/* local storage disabled */}
    }
    void refreshOffline();
    const onSynced=()=>void refreshOffline();
    window.addEventListener("barangay-outbox-synced",onSynced);
    return ()=>window.removeEventListener("barangay-outbox-synced",onSynced);
  },[]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function load(force = false) {
      if (inFlight.current) {
        reloadRequested.current = true;
        return;
      }
      if (!force && Date.now() - lastLoadAt.current < 30_000) return;
      inFlight.current = true;
      setLoading(announcementsRef.current.length === 0 && programsRef.current.length === 0);

      // Render previously saved public information before attempting the network.
      // The snapshots remain readable past their TTL, but must be labeled stale.
      try {
        const [annCache, progCache, orgCache] = await Promise.all([
          loadPublicSnapshot<Announcement[]>("announcements"),
          loadPublicSnapshot<Program[]>("barangay-programs"),
          loadPublicSnapshot<PublicOrganization[]>("barangay-organizations"),
        ]);
        if (!active) return;
        if (annCache && !announcementsRef.current.length) {
          announcementsRef.current = annCache.data;
          setAnnouncements(annCache.data);
        }
        if (progCache && !programsRef.current.length) {
          programsRef.current = progCache.data;
          setPrograms(progCache.data);
        }
        if (orgCache) setOrganizations(orgCache.data);
        if (!navigator.onLine) {
          setErrorMessage("Offline: displaying saved public information that may be outdated. Registrations are not confirmed until synchronized.");
          return;
        }
      } catch {
        if (!navigator.onLine) {
          setErrorMessage("Offline storage is unavailable. Visit this page while connected to save public information.");
          return;
        }
      }

      try {
        const [ann, prog, org] = await Promise.all([
          supabase.from("announcements").select("id,title,description,category,created_at,event_start_at,event_end_at,venue").eq("status", "Published").order("created_at", { ascending: false }),
          supabase.from("barangay_programs").select("id,name,description,category,status,image_url,purok,venue,schedule_details,requirements,registration_open,registration_deadline,registration_opens_at,event_start_at,event_end_at,max_participants,min_age,max_age").eq("is_public", true).in("status", ["Active","On Hold"]).order("created_at", { ascending: false }),
          supabase.from("barangay_organizations").select("id,name,description,org_type,president,contact").eq("status", "Active").order("name"),
        ]);
        if (!active) return;
        if (!ann.error) {
          announcementsRef.current = (ann.data || []) as Announcement[];
          setAnnouncements(announcementsRef.current);
          try { await savePublicSnapshot("announcements", announcementsRef.current, 60 * 60 * 1000); } catch { /* optional cache */ }
        }
        if (!prog.error) {
          programsRef.current = (prog.data || []) as Program[];
          setPrograms(programsRef.current);
          try { await savePublicSnapshot("barangay-programs", programsRef.current, 60 * 60 * 1000); } catch { /* optional cache */ }
        }
        if (!org.error) {
          setOrganizations((org.data || []) as PublicOrganization[]);
          try { await savePublicSnapshot("barangay-organizations", org.data || [], 60 * 60 * 1000); } catch { /* optional cache */ }
        }
        if (ann.error || prog.error || org.error) {
          try {
            if (ann.error) {
              const cached = await loadPublicSnapshot<Announcement[]>("announcements");
              if (cached) { announcementsRef.current = cached.data; setAnnouncements(cached.data); }
            }
            if (prog.error) {
              const cached = await loadPublicSnapshot<Program[]>("barangay-programs");
              if (cached) { programsRef.current = cached.data; setPrograms(cached.data); }
            }
            if (org.error) {
              const cached = await loadPublicSnapshot<PublicOrganization[]>("barangay-organizations");
              if (cached) setOrganizations(cached.data);
            }
          } catch { /* storage unavailable */ }
        }
        setErrorMessage([ann.error?.message, prog.error?.message, org.error?.message].filter(Boolean).length
          ? "Offline or unable to refresh: displaying available public cached information (may be outdated)."
          : "");
        setLoading(false);

        const { data: { user } } = await supabase.auth.getUser();
        if (!active || !user) return;
        const { data: resident, error: residentError } = await supabase.from("residents").select("id").eq("user_id", user.id).maybeSingle();
        if (residentError || !resident || !active) return;
        const { data: existing, error: applicationsError } = await supabase.from("program_enrollees").select("program_id,status,rejection_reason,created_at").eq("resident_id", resident.id);
        if (active && !applicationsError && existing) {
          setApplications(Object.fromEntries(existing.map((item: { program_id: string; status: string }) => [item.program_id, item.status])));
          setApplicationDetails(existing as Array<{ program_id: string; status: string; rejection_reason: string | null; created_at: string }>);
        }
        lastLoadAt.current = Date.now();
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Unable to load updates");
      } finally {
        inFlight.current = false;
        if (active) {
          setLoading(false);
          if (reloadRequested.current) {
            reloadRequested.current = false;
            void load(true);
          }
        }
      }
    }

    void load(true);
    const channel = supabase.channel("resident-updates-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "barangay_programs" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "barangay_organizations" }, () => { void load(); })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <div className="p-4 space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-extrabold text-gray-900">Barangay Updates</h1>
          <p className="text-xs text-gray-500">Programs, organizations, and official announcements from Barangay Hall</p></div>
        <button aria-label="Refresh updates" onClick={() => setRefresh((v) => v + 1)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      {errorMessage && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">Unable to load some updates: {errorMessage}</p>}
      {applyMessage && <p role="status" className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">{applyMessage}</p>}
      <div role="tablist" aria-label="Updates sections" className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1">
        <button id="updates-programs-tab" type="button" role="tab" aria-selected={activeTab === "programs"} aria-controls="updates-programs-panel" onClick={() => setActiveTab("programs")} className={`rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${activeTab === "programs" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"}`}>Programs</button>
        <button id="updates-organizations-tab" type="button" role="tab" aria-selected={activeTab === "organizations"} aria-controls="updates-organizations-panel" onClick={() => setActiveTab("organizations")} className={`rounded-xl px-2 py-3 text-xs font-semibold transition-colors ${activeTab === "organizations" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"}`}>Organizations</button>
        <button id="updates-announcements-tab" type="button" role="tab" aria-selected={activeTab === "announcements"} aria-controls="updates-announcements-panel" onClick={() => setActiveTab("announcements")} className={`rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${activeTab === "announcements" ? "bg-white text-blue-700 shadow-sm" : "text-gray-600"}`}>Announcements</button>
      </div>
      {activeTab === "programs" && <>
      <section className="rounded-2xl border bg-white p-3">
        <button type="button" className="flex w-full justify-between text-sm font-bold" onClick={() => setShowMyApplications((v) => !v)}>My Program Applications <span>{applicationDetails.length} {showMyApplications ? "▲" : "▼"}</span></button>
        {offlineProgramIds.length > 0 && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{offlineProgramIds.length} local application intent(s) — not submitted or reserved until the server confirms.</p>}
        {showMyApplications && <div className="mt-3 space-y-2">{applicationDetails.length === 0 ? <p className="text-xs text-gray-500">No applications yet.</p> : applicationDetails.map((a) => <div key={a.program_id} className="rounded-xl bg-gray-50 p-3 text-xs"><p className="font-semibold">{programs.find((p) => p.id === a.program_id)?.name || "Program"}</p><p>Status: {a.status}</p><p>Applied: {new Date(a.created_at).toLocaleDateString()}</p>{a.rejection_reason && <p className="text-red-700">Reason: {a.rejection_reason}</p>}</div>)}</div>}
      </section>
      <section id="updates-programs-panel" role="tabpanel" aria-labelledby="updates-programs-tab" className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="text-base font-bold">Barangay Programs</h2><span className="text-xs text-gray-500">{programs.length} available</span></div>
        {programs.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Program categories">{["All", ...Array.from(new Set(programs.map((p) => p.category)))].map((category) => <button key={category} type="button" onClick={() => setCategoryFilter(category)} aria-pressed={categoryFilter === category} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${categoryFilter === category ? "bg-blue-600 text-white" : "bg-white text-gray-600"}`}>{category}</button>)}</div>}
        {loading ? <p className="text-sm text-gray-500">Loading programs...</p> : programs.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-gray-500">No active barangay programs have been published by the barangay yet. Please check back for official registration updates.</p> : programs.filter((p) => categoryFilter === "All" || p.category === categoryFilter).map((p) => (
          <article key={p.id} className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{p.category}</span>
            <h3 className="text-sm font-bold text-gray-900">{p.name}</h3>
            {p.image_url && <img src={p.image_url} alt={p.name} className="w-full max-h-52 rounded-xl object-cover" />}
            {p.status === "On Hold" && <p className="rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">Historical / citywide reference only. Not confirmed as a current barangay program. No registration available; please verify with the barangay office.</p>}
            {p.description && <p className="whitespace-pre-line text-xs text-gray-600">{p.description}</p>}
            <div className="space-y-1 text-xs text-gray-500">
              <p>Area: {p.purok || "All Puroks"}</p>
              {p.venue && <p>Venue: {p.venue}</p>}
              {p.event_start_at && <p className="font-semibold text-blue-700">Event: {new Date(p.event_start_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})} (PH time)</p>}
              {p.event_end_at && new Date(p.event_end_at).getTime() < Date.now() && <p className="font-semibold">Completed</p>}
              {p.schedule_details && <p>Schedule notes: {p.schedule_details}</p>}
              {p.requirements && <p className="whitespace-pre-line"><strong>Requirements:</strong> {p.requirements}</p>}
              {p.registration_opens_at && <p>Applications open: {new Date(p.registration_opens_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})}</p>}
              {p.registration_deadline && <p>Apply by: {new Date(p.registration_deadline).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})}</p>}
              {p.max_participants && <p>Capacity: {p.max_participants} slots (subject to availability)</p>}
              {(p.min_age || p.max_age) && <p>Age: {p.min_age || "Any"} – {p.max_age || "Any"}</p>}
              <p className={p.registration_open ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{p.registration_open ? "Registration Open" : "Registration Closed"}</p>
            </div>
            <button type="button" disabled={p.status !== "Active" || !p.registration_open || (!!p.registration_opens_at && new Date(p.registration_opens_at).getTime() > Date.now()) || (!!p.event_start_at && new Date(p.event_start_at).getTime() <= Date.now()) || !!applications[p.id] || applying !== null || (!!p.registration_deadline && new Date(p.registration_deadline).getTime() < Date.now())} onClick={() => void joinProgram(p.id)} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:bg-gray-200 disabled:text-gray-600">{applications[p.id] ? `Application: ${applications[p.id]}` : (p.status !== "Active" || !p.registration_open || (!!p.registration_deadline && new Date(p.registration_deadline).getTime() < Date.now())) ? "Registration Closed" : applying === p.id ? "Submitting..." : "Join Program"}</button>
          </article>
        ))}
      </section>
      </>}
      {activeTab === "organizations" && <section id="updates-organizations-panel" role="tabpanel" aria-labelledby="updates-organizations-tab" className="space-y-3">
        <h2 className="text-base font-bold">Community Organizations</h2>
        {loading ? <p className="text-sm text-gray-500">Loading organizations...</p> : organizations.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-gray-500">No published organizations available.</p> : organizations.map((org) => <article key={org.id} className="rounded-2xl border bg-white p-4 space-y-2"><span className="text-xs font-bold text-blue-700">{org.org_type}</span><h3 className="font-bold">{org.name}</h3>{org.description && <p className="text-sm text-gray-600 whitespace-pre-line">{org.description}</p>}{org.president && <p className="text-xs text-gray-500">President: {org.president}</p>}{org.contact && <p className="text-xs text-gray-500">Contact: {org.contact}</p>}</article>)}
      </section>}
      {activeTab === "announcements" && <section id="updates-announcements-panel" role="tabpanel" aria-labelledby="updates-announcements-tab" className="space-y-3">
        <h2 className="text-base font-bold">Barangay Announcements</h2>
        {loading && <p className="text-sm text-gray-500">Loading announcements...</p>}
        {!loading && announcements.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center"><Megaphone className="mx-auto mb-2 h-6 w-6 text-gray-300" /><p className="text-sm text-gray-500">No announcements yet.</p></div>}
        {announcements.map((a) => (
          <article key={a.id} className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-blue-700">{a.category}</span><span className="flex items-center gap-1 text-[10px] text-gray-400"><Calendar className="h-3 w-3" />{new Date(a.created_at).toLocaleDateString()}</span></div>
            <h3 className="text-sm font-bold">{a.title}</h3>{a.event_start_at && <p className="text-xs font-semibold text-blue-700">Event: {new Date(a.event_start_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})} (PH time)</p>}{a.venue && <p className="text-xs text-gray-600">Venue: {a.venue}</p>}<p className="whitespace-pre-line text-xs text-gray-600">{a.description}</p>
          </article>
        ))}
      </section>}
    </div>
  );
}
