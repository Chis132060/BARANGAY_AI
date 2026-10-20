"use client";

import { useState } from "react";
import { importResidents, type ResidentImportRow } from "../import-actions";

const HEADERS = ["first_name","middle_name","last_name","birth_date","gender","civil_status","contact_number","house_number","street","purok"] as const;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); if (row.some(v => v.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}

export function ResidentCsvImport({ onImported }: { onImported: () => Promise<void> }) {
  const [rows, setRows] = useState<ResidentImportRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function template() {
    const csv = HEADERS.join(",") + "\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "resident-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function load(file: File | undefined) {
    setError(""); setRows([]); setMessage("");
    if (!file) return;
    if (file.size > 1_000_000) { setError("CSV exceeds 1 MB"); return; }
    try {
      const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
      const header = parsed.shift()?.map(v => v.trim().toLowerCase());
      if (!header || HEADERS.some((h, i) => header[i] !== h) || header.length !== HEADERS.length) throw new Error("CSV columns must match the template");
      if (!parsed.length || parsed.length > 200) throw new Error("Choose 1–200 rows");
      const items = parsed.map((cells, index) => {
        if (cells.length !== HEADERS.length) throw new Error(`Wrong column count at row ${index + 2}`);
        const obj = Object.fromEntries(HEADERS.map((h, i) => [h, cells[i].trim()]));
        if (!obj.first_name || !obj.last_name || !obj.street || !obj.purok || !/^\d{4}-\d{2}-\d{2}$/.test(obj.birth_date)
          || !["Male","Female","Other"].includes(obj.gender) || !["Single","Married","Widowed","Divorced"].includes(obj.civil_status))
          throw new Error(`Invalid values at row ${index + 2}`);
        return obj as unknown as ResidentImportRow;
      });
      const keys = items.map(r => [r.first_name,r.last_name,r.birth_date].join("|").toLowerCase());
      if (new Set(keys).size !== keys.length) throw new Error("Duplicate names and birth dates within CSV");
      setRows(items);
    } catch (err) { setError(err instanceof Error ? err.message : "Invalid CSV"); }
  }

  async function submit() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await importResidents(rows);
      setMessage(`Imported ${result.imported} residents.`); setRows([]);
      await onImported();
    } catch (err) { setError(err instanceof Error ? err.message : "Import failed"); }
    finally { setBusy(false); }
  }

  return <section className="rounded-xl border bg-card p-4 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold">Bulk resident import (CSV)</h2><button type="button" onClick={template} className="rounded-lg border px-3 py-2 text-xs font-semibold">Download template</button></div>
    <p className="text-xs text-muted-foreground">Maximum 200 rows per import. Existing residents and duplicates are rejected; the entire batch succeeds or fails together. Import does not create login accounts.</p>
    <input aria-label="Resident CSV file" type="file" accept=".csv,text/csv" onChange={e => void load(e.target.files?.[0])} className="block w-full text-xs" />
    {rows.length > 0 && <div className="space-y-2"><p className="text-xs font-semibold">{rows.length} validated rows ready to import</p><div className="max-h-44 overflow-auto rounded-lg border text-xs">{rows.slice(0,10).map((r,i) => <p key={i} className="border-b px-3 py-2">{r.first_name} {r.last_name} — {r.birth_date} — {r.purok}</p>)}</div><button type="button" disabled={busy} onClick={() => void submit()} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{busy ? "Importing..." : `Import ${rows.length} residents`}</button></div>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {message && <p role="status" className="text-xs text-green-700">{message}</p>}
  </section>;
}
