"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileUp, Info, Loader2, UploadCloud, X } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function template() {
    const csv = HEADERS.join(",") + "\r\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "resident-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function clearSelection() {
    setRows([]); setFileName(""); setError(""); setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function load(file: File | undefined) {
    setError(""); setRows([]); setMessage(""); setFileName("");
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Please select a CSV file."); return; }
    if (file.size > 1_000_000) { setError("CSV exceeds 1 MB"); return; }
    setFileName(file.name);
    setLoading(true);
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
    finally { setLoading(false); }
  }

  async function submit() {
    if (!rows.length || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await importResidents(rows);
      setMessage(`Imported ${result.imported} residents successfully.`);
      setRows([]); setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      await onImported();
    } catch (err) { setError(err instanceof Error ? err.message : "Import failed"); }
    finally { setBusy(false); }
  }

  return (
    <section aria-labelledby="resident-import-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="resident-import-title" className="text-sm font-extrabold tracking-tight text-foreground">Bulk Resident Import</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Add multiple resident records using a CSV file.</p>
          </div>
        </div>
        <button type="button" onClick={template} className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          <Download className="h-4 w-4" aria-hidden="true" /> Download CSV Template
        </button>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        <input
          ref={inputRef}
          id="resident-csv-file"
          aria-label="Resident CSV file"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={busy || loading}
          onChange={event => void load(event.target.files?.[0])}
        />
        <div
          onDragOver={event => { event.preventDefault(); if (!busy && !loading) setDragging(true); }}
          onDragLeave={event => { event.preventDefault(); setDragging(false); }}
          onDrop={event => {
            event.preventDefault(); setDragging(false);
            if (!busy && !loading) void load(event.dataTransfer.files[0]);
          }}
          className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors sm:py-9 ${dragging ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30"}`}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-6 w-6" aria-hidden="true" />}
          </div>
          <p className="text-sm font-bold text-foreground">{loading ? "Validating CSV file…" : "Drag and drop your CSV file here"}</p>
          <p className="mt-1 text-xs text-muted-foreground">or select a file from your device</p>
          <button type="button" disabled={busy || loading} onClick={() => inputRef.current?.click()} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50">
            <FileUp className="h-4 w-4" aria-hidden="true" /> Browse Files
          </button>
          <p className="mt-3 text-[11px] text-muted-foreground">CSV format only · Maximum 1 MB · Up to 200 residents per import</p>
        </div>

        {fileName && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">{fileName}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{loading ? "Validating…" : rows.length ? `${rows.length} rows validated and ready` : "Review the validation message below"}</p>
            </div>
            <button type="button" aria-label="Remove selected file" onClick={clearSelection} disabled={busy || loading} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"><X className="h-4 w-4" /></button>
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-emerald-50/70 px-4 py-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {rows.length} validated {rows.length === 1 ? "resident" : "residents"} ready to import
            </div>
            <div className="max-h-48 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr><th scope="col" className="px-4 py-2.5">Resident</th><th scope="col" className="px-4 py-2.5">Birth date</th><th scope="col" className="px-4 py-2.5">Purok</th></tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {rows.slice(0, 10).map((row, index) => (
                    <tr key={index}><td className="px-4 py-2.5 font-medium text-foreground">{row.first_name} {row.last_name}</td><td className="px-4 py-2.5 text-muted-foreground">{row.birth_date}</td><td className="px-4 py-2.5 text-muted-foreground">{row.purok}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 10 && <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">Showing the first 10 of {rows.length} residents.</p>}
            <div className="flex justify-end border-t border-border bg-muted/20 px-4 py-3">
              <button type="button" disabled={busy} onClick={() => void submit()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileUp className="h-4 w-4" aria-hidden="true" />}
                {busy ? "Importing…" : `Import ${rows.length} ${rows.length === 1 ? "Resident" : "Residents"}`}
              </button>
            </div>
          </div>
        )}

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{error}</div>}
        {message && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />{message}</div>}

        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 px-3.5 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed text-muted-foreground"><span className="font-bold text-foreground">Before you import:</span> Use the CSV template and include up to 200 residents. Existing records and duplicates are rejected. The entire batch succeeds or fails together, and imported residents do not automatically receive login accounts.</p>
        </div>
      </div>
    </section>
  );
}
