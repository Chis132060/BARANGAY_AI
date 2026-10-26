"use client";

import { AdminTable } from "@/components/ui/AdminTable";
import type { ResidentListItem } from "../actions";
import { fetchVerifiedResidentPhoto } from "../actions";
import { MapPin, Phone, Eye, UserX, X, CreditCard, ImageOff } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

interface ResidentTableProps {
  residents: ResidentListItem[];
}

export function ResidentTable({ residents }: ResidentTableProps) {
  const [selectedResident, setSelectedResident] = useState<ResidentListItem | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedResident) {
      setPhotoUrl(null);
      return;
    }
    if (!selectedResident.id_photo_url) {
      setPhotoUrl(null);
      return;
    }
    setPhotoLoading(true);
    setPhotoUrl(null);
    startTransition(() => {
      fetchVerifiedResidentPhoto(selectedResident.id)
        .then((url) => setPhotoUrl(url))
        .catch(() => setPhotoUrl(null))
        .finally(() => setPhotoLoading(false));
    });
  }, [selectedResident]);

  useEffect(() => {
    if (!selectedResident) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedResident(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedResident]);

  return (
    <>
    <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <AdminTable className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              <th className="px-6 py-3.5">Resident Name</th>
              <th className="px-6 py-3.5">Gender / Age</th>
              <th className="px-6 py-3.5">Address & Purok</th>
              <th className="px-6 py-3.5">Classifications</th>
              <th className="px-6 py-3.5">Contact Number</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 text-xs">
            {residents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <UserX className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-xs font-semibold text-muted-foreground">No resident records found matching filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              residents.map((res) => {
                const age = new Date().getFullYear() - new Date(res.birth_date).getFullYear();
                const addressStr = res.address
                  ? `${res.address.house_number || ""} ${res.address.street || ""}, Purok ${res.address.purok || ""}`
                  : "—";

                return (
                  <tr key={res.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 font-bold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-sm border border-primary/20">
                          {res.first_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-foreground">{res.last_name}, {res.first_name} {res.middle_name || ""}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{res.civil_status}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <span className="font-semibold text-foreground">{res.gender}</span>
                      <span className="text-[11px] text-muted-foreground block">{age} yrs old</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{addressStr}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {res.voter_status && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 border border-blue-500/20">
                            Voter
                          </span>
                        )}
                        {res.senior_status && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 border border-amber-500/20">
                            Senior
                          </span>
                        )}
                        {res.pwd_status && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                            PWD
                          </span>
                        )}
                        {res.four_ps_status && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            4Ps
                          </span>
                        )}
                        {!res.voter_status && !res.senior_status && !res.pwd_status && !res.four_ps_status && (
                          <span className="text-muted-foreground font-mono text-[10px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                      {res.contact_number ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{res.contact_number}</span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedResident(res)}
                        aria-label={`View profile of ${res.first_name} ${res.last_name}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-muted/60 hover:bg-primary hover:text-primary-foreground border border-transparent hover:border-primary/20 text-muted-foreground transition-all opacity-0 group-hover:opacity-100"
                        title={`View ${res.first_name} ${res.last_name}'s profile`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </AdminTable>
      </div>
    </div>
    {selectedResident && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedResident(null);
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="resident-profile-title"
          className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Modal header */}
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 shrink-0">
            <div>
              <h2 id="resident-profile-title" className="text-lg font-bold text-foreground">
                {selectedResident.last_name}, {selectedResident.first_name} {selectedResident.middle_name || ""}
              </h2>
              <p className="text-xs text-muted-foreground">Resident Profile</p>
            </div>
            <button type="button" aria-label="Close resident profile" onClick={() => setSelectedResident(null)} className="rounded-lg p-2 hover:bg-muted shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto px-6 pb-6 space-y-5">
            {/* ID Photo section */}
            {selectedResident.id_photo_url && (
              <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    {selectedResident.id_type ? `Submitted ID · ${selectedResident.id_type}` : "Submitted ID Photo"}
                  </span>
                </div>
                <div className="relative w-full min-h-[160px] flex items-center justify-center bg-muted/20">
                  {photoLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  )}
                  {!photoLoading && photoUrl && (
                    <a href={photoUrl} target="_blank" rel="noopener noreferrer" title="Open full ID image" className="block w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt={`ID photo of ${selectedResident.first_name} ${selectedResident.last_name}`}
                        className="w-full max-h-56 object-contain"
                      />
                    </a>
                  )}
                  {!photoLoading && !photoUrl && (
                    <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                      <span className="text-xs">Photo unavailable</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Details grid */}
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              {([
                ["Gender", selectedResident.gender],
                ["Date of birth", selectedResident.birth_date],
                ["Civil status", selectedResident.civil_status],
                ["Contact number", selectedResident.contact_number || "—"],
                ["House number", selectedResident.address?.house_number || "—"],
                ["Street", selectedResident.address?.street || "—"],
                ["Purok", selectedResident.address?.purok || "—"],
                ["Verification", selectedResident.verification_status || "—"],
                ["Voter", selectedResident.voter_status ? "Yes" : "No"],
                ["Senior", selectedResident.senior_status ? "Yes" : "No"],
                ["PWD", selectedResident.pwd_status ? "Yes" : "No"],
                ["4Ps", selectedResident.four_ps_status ? "Yes" : "No"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
                  <dd className="mt-1 break-words font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </div>
    )}
    </>
  );
}
