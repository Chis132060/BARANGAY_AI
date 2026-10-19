"use client";

import { AdminTable } from "@/components/ui/AdminTable";
import type { ResidentListItem } from "../actions";
import { MapPin, Phone, Eye, UserX } from "lucide-react";

interface ResidentTableProps {
  residents: ResidentListItem[];
}

export function ResidentTable({ residents }: ResidentTableProps) {
  return (
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
  );
}
