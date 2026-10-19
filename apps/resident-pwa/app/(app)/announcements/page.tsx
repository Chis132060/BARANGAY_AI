"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Megaphone, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Announcement {
  id: string; title: string; description: string; category: string; created_at: string;
}
interface Program {
  id: string; name: string; description: string | null; category: string;
  purok: string | null; venue: string | null; schedule_details: string | null;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [applications, setApplications] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState<string | null>(null);
  const [applyMessage, setApplyMessage] = useState("");

  async function joinProgram(programId: string) {
    setApplying(programId);
    setApplyMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("apply_to_barangay_program", { p_program_id: programId });
      if (error) throw error;
      setApplications((prev) => ({ ...prev, [programId]: "Pending" }));
      setApplyMessage("Application submitted. Await barangay review.");
    } catch (error) {
      setApplyMessage(error instanceof Error ? error.message : "Unable to submit application");
    } finally {
      setApplying(null);
    }
  }

  const lastLoadAt = useRef(0);
  const inFlight = useRef(false);
  const announcementsRef = useRef<Announcement[]>([]);
  const programsRef = useRef<Program[]>([]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    async function load(force = false) {
      if (inFlight.current || (!force && Date.now() - lastLoadAt.current < 30_000)) return;
      inFlight.current = true;
      setLoading(announcementsRef.current.length === 0 && programsRef.current.length === 0);
      try {
      const [ann, prog] = await Promise.all([
        supabase.from("announcements").select("id,title,description,category,created_at").eq("status", "Published").order("created_at", { ascending: false }),
        supabase.from("barangay_programs").select("id,name,description,category,purok,venue,schedule_details").eq("is_public", true).eq("status", "Active").order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (!ann.error) {
        announcementsRef.current = (ann.data || []) as Announcement[];
        setAnnouncements(announcementsRef.current);
      }
      if (!prog.error) {
        programsRef.current = (prog.data || []) as Program[];
        setPrograms(programsRef.current);
      }
      setErrorMessage([ann.error?.message, prog.error?.message].filter(Boolean).join("; "));
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: resident } = await supabase.from("residents").select("id").eq("user_id", user.id).maybeSingle();
        if (resident) {
          const { data: existing } = await supabase.from("program_enrollees").select("program_id,status").eq("resident_id", resident.id);
          if (active && existing) setApplications(Object.fromEntries(existing.map((a: { program_id: string; status: string }) => [a.program_id, a.status])));
        }
      }
      lastLoadAt.current = Date.now();
      } catch (error) {
        if (active) setErrorMessage(error instanceof Error ? error.message : "Unable to load updates");
      } finally {
        inFlight.current = false;
        if (active) setLoading(false);
      }
    }
    void load(true);
    const channel = supabase.channel("resident-updates-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => { void load(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "barangay_programs" }, () => { void load(); })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [refresh]);

  return (
    <div className="p-4 space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-extrabold text-gray-900">Barangay Programs & Updates</h1>
          <p className="text-xs text-gray-500">Official programs and announcements from Barangay Hall</p></div>
        <button aria-label="Refresh updates" onClick={() => setRefresh((v) => v + 1)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
      </div>
      {errorMessage && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-700">Unable to load some updates: {errorMessage}</p>}
      {applyMessage && <p role="status" className="rounded-xl bg-blue-50 p-3 text-xs text-blue-800">{applyMessage}</p>}
      <section className="space-y-3">
        <h2 className="text-base font-bold">Barangay Programs</h2>
        {loading ? <p className="text-sm text-gray-500">Loading programs...</p> : programs.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-gray-500">No published barangay programs yet.</p> : programs.map((p) => (
          <article key={p.id} className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">{p.category}</span>
            <h3 className="text-sm font-bold text-gray-900">{p.name}</h3>
            {p.description && <p className="whitespace-pre-line text-xs text-gray-600">{p.description}</p>}
            <div className="space-y-1 text-xs text-gray-500">
              <p>Area: {p.purok || "All Puroks"}</p>
              {p.venue && <p>Venue: {p.venue}</p>}
              {p.schedule_details && <p>Schedule: {p.schedule_details}</p>}
            </div>
            <button type="button" disabled={!!applications[p.id] || applying === p.id} onClick={() => joinProgram(p.id)} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:bg-gray-200 disabled:text-gray-600">{applications[p.id] ? `Application: ${applications[p.id]}` : applying === p.id ? "Submitting..." : "Join Program"}</button>
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-bold">Barangay Announcements</h2>
        {!loading && announcements.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center"><Megaphone className="mx-auto mb-2 h-6 w-6 text-gray-300" /><p className="text-sm text-gray-500">No announcements yet.</p></div>}
        {announcements.map((a) => (
          <article key={a.id} className="space-y-2 rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-blue-700">{a.category}</span><span className="flex items-center gap-1 text-[10px] text-gray-400"><Calendar className="h-3 w-3" />{new Date(a.created_at).toLocaleDateString()}</span></div>
            <h3 className="text-sm font-bold">{a.title}</h3><p className="whitespace-pre-line text-xs text-gray-600">{a.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
