"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Megaphone, RefreshCw, X, ArrowRight } from "lucide-react";
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
  registration_deadline: string | null; registration_opens_at: string | null; event_start_at: string | null; min_age: number | null; max_age: number | null;
}
type ResidentEligibility = { state: "loading" | "verified" | "unverified" | "missing" | "unavailable"; age: number | null };

function getResidentAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day)) age -= 1;
  return age >= 0 ? age : null;
}

function getProgramEligibilityMessage(program: Program, resident: ResidentEligibility): string {
  if (resident.state === "loading") return "Checking your resident profile…";
  if (resident.state === "unavailable") return "Unable to check your resident profile. Refresh the page and try again.";
  if (resident.state === "missing") return "A resident profile must be linked to your account before you can apply.";
  if (resident.state === "unverified") return "Your resident profile must be verified before you can apply.";
  if ((program.min_age !== null || program.max_age !== null) && resident.age === null) return "Add your date of birth to your resident profile before applying to this age-restricted program.";
  if (resident.age !== null && ((program.min_age !== null && resident.age < program.min_age) || (program.max_age !== null && resident.age > program.max_age))) {
    return `This program is open to ages ${program.min_age ?? "any age"}${program.max_age !== null ? `–${program.max_age}` : " and above"}. Your profile age does not meet this requirement.`;
  }
  return "";
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
  const [applyError, setApplyError] = useState("");
  const [residentEligibility, setResidentEligibility] = useState<ResidentEligibility>({ state: "loading", age: null });
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"programs" | "organizations" | "announcements">("programs");
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const lastLoadAt = useRef(0);
  const announcementsRef = useRef<Announcement[]>([]);
  const programsRef = useRef<Program[]>([]);

  async function joinProgram(programId: string) {
    if (applying || applications[programId]) return;
    const program = programs.find((item) => item.id === programId);
    if (program) {
      const eligibilityMessage = getProgramEligibilityMessage(program, residentEligibility);
      if (eligibilityMessage) {
        setApplyError(eligibilityMessage);
        return;
      }
    }
    setApplying(programId);
    setApplyMessage("");
    setApplyError("");
    try {
      const supabase = createClient();
      if (!navigator.onLine) {
        const {data:{session}}=await supabase.auth.getSession();
        if(!session?.user?.id)throw new Error("Sign in before saving an offline program application.");
        await queueProgramIntent(session.user.id,programId);
        setOfflineProgramIds(prev=>Array.from(new Set([...prev,programId])));
        setApplyMessage("Program application saved on this device — NOT submitted or a reserved slot. Eligibility and deadlines will be checked when online.");
        setSelectedProgram(null);
        return;
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Please sign in before applying.");
      const { error } = await supabase.rpc("apply_to_barangay_program", { p_program_id: programId });
      if (error) throw error;
      setApplications((prev) => ({ ...prev, [programId]: "Pending" }));
      setApplyMessage("Application submitted. Await barangay review.");
      setSelectedProgram(null);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "Unable to submit application.";
      const selected = selectedProgram?.id === programId ? selectedProgram : programs.find((program) => program.id === programId);
      setApplyError(message.includes("Age eligibility not met") && selected
        ? `This program is for ages ${selected.min_age ?? "any age"}${selected.max_age ? `–${selected.max_age}` : " and above"}. Your resident profile does not meet this age requirement.`
        : message.includes("Birth date required for eligibility")
          ? "Add your date of birth to your resident profile before applying to this age-restricted program."
          : message.includes("Verified resident account required")
            ? "A verified resident profile must be linked to your account before you can apply. Contact barangay staff if this seems incorrect."
            : message);
    } finally {
      setApplying(null);
    }
  }

  useEffect(() => {
    if (!selectedProgram) return;
    const main = document.querySelector("main");
    const previousMainOverflowY = main instanceof HTMLElement ? main.style.overflowY : "";
    const previousBodyOverflow = document.body.style.overflow;
    if (main instanceof HTMLElement) main.style.overflowY = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      if (main instanceof HTMLElement) main.style.overflowY = previousMainOverflowY;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [selectedProgram]);

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
    // Keep request coordination scoped to this effect instance. React Strict Mode
    // can tear down and recreate effects while async cache reads are still pending.
    let inFlight = false;
    let reloadRequested = false;

    async function load(force = false) {
      if (inFlight) {
        reloadRequested = true;
        return;
      }
      if (!force && Date.now() - lastLoadAt.current < 30_000) return;
      inFlight = true;
      setLoading(announcementsRef.current.length === 0 && programsRef.current.length === 0);

      // Render previously saved public information before attempting the network.
      // The snapshots remain readable past their TTL, but must be labeled stale.
      try {
        let cacheTimer: number | undefined;
        const cacheReads = Promise.all([
          loadPublicSnapshot<Announcement[]>("announcements"),
          loadPublicSnapshot<Program[]>("barangay-programs"),
          loadPublicSnapshot<PublicOrganization[]>("barangay-organizations"),
        ]);
        let cachedSnapshots: Awaited<typeof cacheReads> | null;
        try {
          cachedSnapshots = await Promise.race([
            cacheReads,
            new Promise<null>((resolve) => { cacheTimer = window.setTimeout(() => resolve(null), 1500); }),
          ]);
        } finally {
          if (cacheTimer !== undefined) window.clearTimeout(cacheTimer);
        }
        const [annCache, progCache, orgCache] = cachedSnapshots ?? [null, null, null];
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
          setLoading(false);
          inFlight = false;
          return;
        }
      } catch {
        if (!navigator.onLine) {
          setErrorMessage("Offline storage is unavailable. Visit this page while connected to save public information.");
          setLoading(false);
          inFlight = false;
          return;
        }
      }

      const requestController = new AbortController();
      const requestTimeout = window.setTimeout(() => requestController.abort(), 12_000);
      try {
        const [ann, prog, org] = await Promise.all([
          supabase.from("announcements").select("id,title,description,category,created_at,event_start_at,event_end_at,venue").eq("status", "Published").order("created_at", { ascending: false }).abortSignal(requestController.signal),
          supabase.from("barangay_programs").select("id,name,description,category,status,image_url,purok,venue,schedule_details,requirements,registration_open,registration_deadline,registration_opens_at,event_start_at,min_age,max_age").eq("is_public", true).eq("status", "Active").order("created_at", { ascending: false }).abortSignal(requestController.signal),
          supabase.from("barangay_organizations").select("id,name,description,org_type,president,contact").eq("status", "Active").order("name").abortSignal(requestController.signal),
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
              if (cached) { const activePrograms = cached.data.filter(program => program.status === "Active"); programsRef.current = activePrograms; setPrograms(activePrograms); }
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
        if (!active) return;
        if (!user) {
          setResidentEligibility({ state: "missing", age: null });
          return;
        }
        const { data: resident, error: residentError } = await supabase.from("residents").select("id,birth_date,verification_status").eq("user_id", user.id).maybeSingle();
        if (!active) return;
        if (residentError) {
          setResidentEligibility({ state: "unavailable", age: null });
          return;
        }
        if (!resident) {
          setResidentEligibility({ state: "missing", age: null });
          return;
        }
        setResidentEligibility({ state: resident.verification_status === "Verified" ? "verified" : "unverified", age: getResidentAge(resident.birth_date) });
        const { data: existing, error: applicationsError } = await supabase.from("program_enrollees").select("program_id,status,rejection_reason,created_at").eq("resident_id", resident.id);
        if (active && !applicationsError && existing) {
          setApplications(Object.fromEntries(existing.map((item: { program_id: string; status: string }) => [item.program_id, item.status])));
          setApplicationDetails(existing as Array<{ program_id: string; status: string; rejection_reason: string | null; created_at: string }>);
        }
        lastLoadAt.current = Date.now();
      } catch (error) {
        if (active) setErrorMessage(requestController.signal.aborted
          ? "Updates are taking too long to load. Check your connection and try again."
          : error instanceof Error ? error.message : "Unable to load updates");
      } finally {
        window.clearTimeout(requestTimeout);
        inFlight = false;
        if (active) {
          setLoading(false);
          if (reloadRequested) {
            reloadRequested = false;
            void load(true);
          }
        }
      }
    }

    void load(true);
    const handleOnline = () => void load(true);
    window.addEventListener("online", handleOnline);
    const channel = supabase.channel("resident-updates-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "barangay_programs" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "barangay_organizations" }, () => { void load(); })
      .subscribe();
    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const selectedEligibilityMessage = selectedProgram ? getProgramEligibilityMessage(selectedProgram, residentEligibility) : "";

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
            {p.description && <p className="whitespace-pre-line text-xs text-gray-600 line-clamp-3">{p.description}</p>}
            <div className="space-y-1 text-xs text-gray-500">
              <p>Area: {p.purok || "All Puroks"}</p>
              <p className={p.registration_open ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>{p.registration_open ? "Registration Open" : "Registration Closed"}</p>
            </div>
          <button type="button" onClick={() => { setApplyError(""); setSelectedProgram(p); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white">Learn about this program <ArrowRight className="h-4 w-4" /></button>
          </article>
        ))}
      </section>
      </>}
      {selectedProgram && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onClick={() => setSelectedProgram(null)}>
        <section role="dialog" aria-modal="true" aria-labelledby="program-detail-title" onClick={(event) => event.stopPropagation()} className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
          <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-5"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{selectedProgram.category}</span><button type="button" aria-label="Close program details" onClick={() => setSelectedProgram(null)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {selectedProgram.image_url && <img src={selectedProgram.image_url} alt={selectedProgram.name} className="mb-4 h-36 w-full rounded-2xl bg-slate-100 object-cover sm:h-40" />}
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Welcome to the program</p>
          <h2 id="program-detail-title" className="mt-1 text-xl font-extrabold text-gray-900">{selectedProgram.name}</h2>
          <p className="mt-3 whitespace-pre-line break-words text-sm leading-relaxed text-gray-700">{selectedProgram.description || "Learn more about this barangay program. Contact the barangay office for details."}</p>
          <div className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm text-gray-700">
            <p><strong>Area:</strong> {selectedProgram.purok || "All Puroks"}</p>
            {selectedProgram.venue && <p><strong>Venue:</strong> {selectedProgram.venue}</p>}
            {selectedProgram.event_start_at && <p><strong>Program starts:</strong> {new Date(selectedProgram.event_start_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})} (PH time)</p>}
            {selectedProgram.schedule_details && <p><strong>Schedule:</strong> {selectedProgram.schedule_details}</p>}
            {selectedProgram.requirements && <p className="whitespace-pre-line"><strong>Who can join / what to prepare:</strong><br />{selectedProgram.requirements}</p>}
            {(selectedProgram.min_age || selectedProgram.max_age) && <p><strong>Age:</strong> {selectedProgram.min_age || "Any"}–{selectedProgram.max_age || "Any"}</p>}
            {selectedProgram.registration_opens_at && <p><strong>Applications open:</strong> {new Date(selectedProgram.registration_opens_at).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})}</p>}
            {selectedProgram.registration_deadline && <p><strong>Apply by:</strong> {new Date(selectedProgram.registration_deadline).toLocaleString("en-PH",{timeZone:"Asia/Manila",dateStyle:"medium",timeStyle:"short"})}</p>}
          </div>
          </div>
          <div className="shrink-0 border-t bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
          {(applyError || selectedEligibilityMessage) && <p role={applyError ? "alert" : "status"} className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">{applyError || selectedEligibilityMessage}</p>}
          <button type="button" disabled={!!selectedEligibilityMessage || selectedProgram.status !== "Active" || !selectedProgram.registration_open || (!!selectedProgram.registration_opens_at && new Date(selectedProgram.registration_opens_at).getTime() > Date.now()) || !!applications[selectedProgram.id] || applying !== null || applyError.includes("does not meet this age requirement") || (!!selectedProgram.registration_deadline && new Date(selectedProgram.registration_deadline).getTime() < Date.now())} onClick={() => void joinProgram(selectedProgram.id)} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500">{applications[selectedProgram.id] ? `Application: ${applications[selectedProgram.id]}` : selectedEligibilityMessage ? selectedEligibilityMessage.includes("Checking") ? "Checking eligibility..." : selectedEligibilityMessage.includes("ages") ? "Age requirement not met" : "Resident profile required" : applyError.includes("does not meet this age requirement") ? "Age requirement not met" : selectedProgram.status !== "Active" || !selectedProgram.registration_open || (!!selectedProgram.registration_deadline && new Date(selectedProgram.registration_deadline).getTime() < Date.now()) ? "Registration Closed" : applying === selectedProgram.id ? "Submitting..." : "I am interested - apply to join"}</button>
          {!selectedEligibilityMessage && !applyError && <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">Your application will be reviewed by barangay staff. A submitted application does not guarantee a slot.</p>}
          </div>
        </section>
      </div>}
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
