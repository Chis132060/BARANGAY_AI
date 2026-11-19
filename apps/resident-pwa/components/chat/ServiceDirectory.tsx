"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, Search, X, Megaphone, Users, HandHeart, ClipboardList, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadPublicSnapshot } from "@/lib/offline/public-snapshots";

type ServiceDocument = { id: string; name: string; description: string | null };
type DirectoryLink = { name: string; description: string; href: string; icon: typeof FileText };
const OTHER_SERVICES: DirectoryLink[] = [
  { name: "Barangay programs & assistance", description: "Browse published community programs", href: "/announcements?tab=programs", icon: HandHeart },
  { name: "Barangay announcements", description: "Read official updates and notices", href: "/announcements?tab=announcements", icon: Megaphone },
  { name: "Community organizations", description: "See active local organizations", href: "/announcements?tab=organizations", icon: Users },
  { name: "My requests & status", description: "Review submitted applications and payments", href: "/requests", icon: ClipboardList },
  { name: "Help & concerns", description: "Contact barangay support and submit a concern", href: "/support", icon: MessageCircle },
];

export function ServiceDirectory({ open, onClose, onAsk }: {
  open: boolean;
  onClose: () => void;
  onAsk: (question: string) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [documents, setDocuments] = useState<ServiceDocument[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    setLoading(true);
    setWarning("");
    let active = true;
    async function load() {
      try {
        const { data, error } = await supabase.from("document_types")
          .select("id,name,description").order("name").limit(100);
        if (error) throw error;
        if (active) setDocuments((data || []) as ServiceDocument[]);
      } catch {
        try {
          const cached = await loadPublicSnapshot<ServiceDocument[]>("document-types");
          if (active && cached) {
            setDocuments(cached.data.map(d => ({ id: d.id, name: d.name, description: d.description })));
            setWarning("Saved catalog shown. It may be outdated; confirm services before applying.");
          } else if (active) {
            setDocuments([]);
            setWarning("Cannot load document services right now. You can still open the Requests page.");
          }
        } catch {
          if (active) {
            setDocuments([]);
            setWarning("Cannot load document services right now. Try Requests when connected.");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [open, supabase]);

  if (!open) return null;
  const needle = query.trim().toLocaleLowerCase();
  const visibleDocuments = documents.filter(d => [d.name, d.description || ""].join(" ").toLowerCase().includes(needle));
  const visibleOther = OTHER_SERVICES.filter(s => [s.name, s.description].join(" ").toLowerCase().includes(needle));
  const showAsk = !needle || "barangay ordinances office hours policies rules requirements".includes(needle);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4"
      onClick={onClose} role="presentation">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="service-directory-title"
        onClick={event => event.stopPropagation()}
        onKeyDown={event => {
          if (event.key === "Escape") { onClose(); return; }
          if (event.key !== "Tab") return;
          const options = dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled])'
          );
          if (!options?.length) return;
          const first = options[0], last = options[options.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }}
        className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 id="service-directory-title" className="text-lg font-extrabold text-slate-900">All barangay services</h2>
            <p className="mt-1 text-xs text-slate-600">Services and resources available in the resident app</p>
          </div>
          <button type="button" aria-label="Close services" onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="border-b border-slate-100 px-4 py-3">
          <label htmlFor="service-search" className="sr-only">Search barangay services</label>
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <input ref={searchRef} id="service-search" type="search" value={query} onChange={event => setQuery(event.target.value)}
              placeholder="Search documents and services..." className="h-12 min-w-0 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-500" />
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-8">
          {warning && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{warning}</p>}
          <section aria-labelledby="directory-documents-title">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 id="directory-documents-title" className="text-sm font-bold text-slate-900">Documents & certificates</h3>
              <p className="text-xs font-semibold text-blue-700">Choose a document below</p>
            </div>
            {loading ? <p role="status" className="text-sm text-slate-500">Loading available documents...</p> :
              visibleDocuments.length ? (
                <div className="space-y-2">
                  {visibleDocuments.map(doc => (
                    <button key={doc.id} type="button" onClick={() => { onClose(); onAsk(`I want to request ${doc.name}`); }}
                      className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                      <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><FileText className="h-5 w-5" aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{doc.name}</span>
                        <span className="line-clamp-2 text-xs text-slate-600">{doc.description || "See the current requirements in the application form."}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{needle ? "No matching documents." : "No document types are available to display."}</p>}
          </section>
          <section aria-labelledby="directory-other-title">
            <h3 id="directory-other-title" className="mb-3 text-sm font-bold text-slate-900">Community & support</h3>
            <div className="space-y-2">
              {visibleOther.map(service => (
                <Link key={service.href} href={service.href} onClick={onClose}
                  className="flex min-h-16 w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  <span className="rounded-xl bg-slate-100 p-2.5 text-slate-700"><service.icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{service.name}</span>
                    <span className="block text-xs text-slate-600">{service.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                </Link>
              ))}
              {!visibleOther.length && <p className="text-xs text-slate-500">No matching community services.</p>}
            </div>
          </section>
          {showAsk && <section className="rounded-2xl bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-950">Need information about rules or office hours?</h3>
            <p className="mt-1 text-xs text-blue-800">Ask Ate Sora to look for current official records. Unverified details will be identified.</p>
            <button type="button" onClick={() => { onClose(); onAsk("What are the current official barangay office hours and ordinances?"); }}
              className="mt-3 min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white">
              Ask Ate Sora
            </button>
          </section>}
        </div>
      </div>
    </div>
  );
}
