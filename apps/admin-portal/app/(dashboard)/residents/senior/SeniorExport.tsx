"use client";
import type { ResidentListItem } from "../actions";
export function SeniorExport({ residents }: { residents: ResidentListItem[] }) {
  function download() {
    const quote = (value: unknown) => JSON.stringify(String(value ?? "").replace(/^\s*[=+@-]/, "'$&"));
    const rows = [["ID","First name","Last name","Birth date"],...residents.map(r => [r.id,r.first_name,r.last_name,r.birth_date])];
    const csv = rows.map(row => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    const link = document.createElement("a"); link.href=url; link.download="senior-registry.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <button type="button" onClick={download} className="rounded-lg border px-4 py-2 text-sm">Export CSV</button>;
}
