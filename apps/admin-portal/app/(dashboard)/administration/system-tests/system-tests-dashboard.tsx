"use client";

import { useRef, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, FileUp, FlaskConical, ShieldCheck } from "lucide-react";

type TestResult = {
  id: string;
  suite: string;
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  severity: string;
  durationMs: number | null;
  issues: string[];
  request: unknown;
  response: unknown;
  error: string | null;
  coverageNote: string;
};
type TestReport = {
  schemaVersion: number;
  generatedAt: string;
  source: string;
  coverage: { kind: string; note: string };
  suites: Array<{ app: string; status: string; tests: number; passed: number; failed: number }>;
  results: TestResult[];
};
type AuditIssue = { id: string; title: string; severity: string; location: string; finding: string; status: string; unresolved: boolean };

const issues: AuditIssue[] = [
  { id: "A-01", title: "Resident payment submission", severity: "Critical", location: "PWA Requests / payments RPC", finding: "Payment insert used the auth UUID instead of residents.id; direct table write conflicts with RLS and status update was not atomic.", status: "Code and migration prepared; staging database verification pending.", unresolved: true },
  { id: "A-02", title: "Resident ID photos unavailable", severity: "High", location: "Admin resident profile / resident-ids storage", finding: "11 of 14 live photo references did not resolve to an object URL handled by the current resolver.", status: "Unresolved: protected storage reconciliation is required before migrating references.", unresolved: true },
  { id: "A-03", title: "Unlinked household member registration", severity: "High", location: "Household verification / PWA registration", finding: "Previously verified, unlinked household rows could be followed by a separate PWA resident row.", status: "Code guard prepared; live migration and identity workflow verification pending.", unresolved: true },
  { id: "A-04", title: "Dashboard query errors shown as zero", severity: "High", location: "Admin Dashboard", finding: "Supabase query errors could be ignored and null metric values rendered as zero.", status: "Code fix added; regression check passes.", unresolved: false },
  { id: "A-05", title: "Population includes pending applicants", severity: "Medium", location: "Admin Dashboard / Reports", finding: "Population and demographic counts did not consistently filter to verified residents.", status: "Code fix added; regression check passes.", unresolved: false },
  { id: "A-06", title: "Family total mislabeled as households", severity: "Medium", location: "Admin Dashboard metrics", finding: "A family count was populated with the household count despite households containing multiple families.", status: "Removed the unsupported family metric field; household totals remain explicit.", unresolved: false },
  { id: "A-07", title: "Verification actions accept unlinked rows", severity: "Medium", location: "Admin Verification Queue", finding: "Approve/reject updates did not require a linked resident account.", status: "Queue and transitions now require user_id; regression checks pass.", unresolved: false },
  { id: "A-08", title: "Photo tests coupled to source layout", severity: "Low", location: "Admin verification tests", finding: "Tests expected signing inline even though the action calls a shared resolver.", status: "Tests now validate the helper and action boundary; suite passes.", unresolved: false },
  { id: "A-09", title: "Migration history drift", severity: "High", location: "Supabase migrations", finding: "Checked-in migration timestamps collide and the live ledger differs from filenames.", status: "Unresolved: reconcile ledger in a staging project before migration history repair.", unresolved: true },
  { id: "A-10", title: "Anonymous RPC grants", severity: "High", location: "SECURITY DEFINER RPC privileges", finding: "Nine live functions allowed anon execution; reviewed function bodies did not prove an exploit.", status: "Least-privilege migration prepared; staging and live privilege checks pending.", unresolved: true },
  { id: "A-11", title: "Payment table RLS blocks intended flows", severity: "High", location: "Supabase payments table", finding: "The live RLS-enabled payments table had no policies; staff payment relations also need authorized read access.", status: "Server-only submission and staff read policy prepared; migration not applied.", unresolved: true },
  { id: "A-12", title: "Stale PWA refresh token log noise", severity: "Low", location: "Resident PWA middleware", finding: "A low-frequency refresh_token_not_found error was caught as an unauthenticated request.", status: "Middleware now clears stale Supabase cookies; deployment verification pending.", unresolved: true },
  { id: "A-13", title: "AI model download during API import", severity: "Medium", location: "FastAPI embedding and reranking providers", finding: "Local embedding and cross-encoder models were initialized during imports, blocking startup when Hugging Face was unreachable.", status: "Both model loads are deferred; FastAPI import verified locally.", unresolved: false },
  { id: "A-14", title: "No PWA-visible programs in current state", severity: "Info", location: "Admin Programs / PWA", finding: "All eight inspected live programs were inactive and unpublished; this matches current state but leaves none visible in the PWA.", status: "No defect confirmed; administrators must decide which programs to activate.", unresolved: true },
];

function isReport(value: unknown): value is TestReport {
  if (!value || typeof value !== "object") return false;
  const report = value as TestReport;
  return report.schemaVersion === 1 && typeof report.generatedAt === "string" && Number.isFinite(Date.parse(report.generatedAt))
    && typeof report.source === "string" && Array.isArray(report.suites) && Array.isArray(report.results) && report.results.length <= 10000
    && report.results.every((test) => typeof test.id === "string" && typeof test.suite === "string" && typeof test.name === "string"
      && ["PASS", "FAIL", "SKIP"].includes(test.status) && typeof test.severity === "string"
      && (test.durationMs === null || (typeof test.durationMs === "number" && Number.isFinite(test.durationMs)))
      && Array.isArray(test.issues) && test.issues.every((issue) => typeof issue === "string")
      && (test.error === null || typeof test.error === "string") && typeof test.coverageNote === "string");
}

function badgeClass(status: string) {
  if (status === "PASS") return "bg-emerald-100 text-emerald-800";
  if (status === "FAIL") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-700";
}

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key,
      /authorization|token|password|secret|cookie|api.?key/i.test(key) ? "[REDACTED]" : redactSensitive(child),
    ]));
  }
  return value;
}

function jsonDetails(value: unknown) {
  return JSON.stringify(redactSensitive(value), null, 2);
}

export function SystemTestsDashboard() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<TestReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const passCount = report?.results.filter((test) => test.status === "PASS").length ?? 0;
  const failCount = report?.results.filter((test) => test.status === "FAIL").length ?? 0;
  const unresolvedCount = issues.filter((issue) => issue.unresolved && issue.severity !== "Info").length;
  const shownTests = (report?.results || []).filter((test) => filter === "All" || test.status === filter);

  async function loadReport(file?: File) {
    if (!file) return;
    setError(null);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Test report must be smaller than 10 MB.");
      const parsed: unknown = JSON.parse(await file.text());
      if (!isReport(parsed)) throw new Error("This file is not a supported system test report.");
      setReport(parsed);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this report.");
    }
    if (fileInput.current) fileInput.current.value = "";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-2xl font-extrabold">System Tests &amp; Audit</h1>
          <p className="mt-1 text-sm text-muted-foreground">Recorded local test runs and unresolved audit findings.</p>
        </div>
        <div>
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Upload a system test report" onChange={(event) => void loadReport(event.target.files?.[0])} />
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <FileUp className="h-4 w-4" /> Upload test report
          </button>
        </div>
      </header>

      <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <strong>Production CRUD and HTTP method checks are not run here.</strong> This report viewer accepts local test output only. Live write tests require an isolated staging project and fixtures.
      </div>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section aria-label="Test summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={<FlaskConical className="h-4 w-4" />} label="Tests recorded" value={report?.results.length ?? "—"} />
        <SummaryCard icon={<CheckCircle2 className="h-4 w-4" />} label="Passed" value={report ? passCount : "—"} />
        <SummaryCard icon={<AlertTriangle className="h-4 w-4" />} label="Failed" value={report ? failCount : "—"} />
        <SummaryCard icon={<Activity className="h-4 w-4" />} label="Unresolved findings" value={unresolvedCount} />
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
          <div><h2 className="font-bold">Test executions</h2><p className="mt-1 text-xs text-muted-foreground">Per-test duration and status come from the uploaded Node JUnit report.</p></div>
          <label className="text-sm">Show <select value={filter} onChange={(event) => setFilter(event.target.value)} className="ml-2 rounded-md border bg-background px-2 py-1"><option>All</option><option>PASS</option><option>FAIL</option><option>SKIP</option></select></label>
        </div>
        {report ? <>
          <div className="flex flex-wrap gap-x-5 gap-y-2 border-b bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
            <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span><span>Source: {report.source}</span><span>Coverage: {report.coverage?.note || "Not provided"}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">Test</th><th className="px-4 py-3">Suite</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Issues</th></tr></thead><tbody className="divide-y">
              {shownTests.map((test) => <tr key={test.id} className="align-top"><td className="max-w-[440px] px-5 py-3"><details><summary className="cursor-pointer font-medium">{test.name}</summary><div className="mt-3 space-y-2 rounded-lg bg-muted/30 p-3 text-xs"><div><strong>Request:</strong> {test.request == null ? "Not recorded; this test makes no HTTP request." : <pre className="mt-1 overflow-auto">{jsonDetails(test.request)}</pre>}</div><div><strong>Response:</strong> {test.response == null ? "Not recorded by this test runner." : <pre className="mt-1 overflow-auto">{jsonDetails(test.response)}</pre>}</div><div><strong>Coverage:</strong> {test.coverageNote}</div>{test.error && <div className="text-red-700"><strong>Error:</strong><pre className="mt-1 whitespace-pre-wrap">{test.error}</pre></div>}</div></details></td><td className="px-4 py-3">{test.suite}</td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{test.durationMs == null ? "Not measured" : `${test.durationMs} ms`}</span></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${badgeClass(test.status)}`}>{test.status}</span></td><td className="px-4 py-3">{test.severity}</td><td className="px-4 py-3">{test.issues.length ? test.issues.join(", ") : "—"}</td></tr>)}
              {!shownTests.length && <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No tests match this filter.</td></tr>}
            </tbody></table>
          </div>
        </> : <div className="p-8 text-center"><FlaskConical className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-semibold">No execution report loaded</p><p className="mt-1 text-sm text-muted-foreground">Run <code>npm run test:report</code>, then upload <code>.test-results/system-test-report.json</code>.</p></div>}
      </section>

      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center gap-2 border-b p-5"><ShieldCheck className="h-5 w-5 text-primary" /><div><h2 className="font-bold">Audit findings</h2><p className="mt-1 text-xs text-muted-foreground">Current implementation state and work still requiring staging or data review.</p></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-3">ID / issue</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Page / endpoint</th><th className="px-4 py-3">Fix status</th><th className="px-4 py-3">State</th></tr></thead><tbody className="divide-y">{issues.map((issue) => { const state = issue.severity === "Info" ? "Advisory" : issue.unresolved ? "Open" : "Fixed"; return <tr key={issue.id} className="align-top"><td className="px-5 py-3"><strong>{issue.id}</strong><p className="mt-1 font-medium">{issue.title}</p><p className="mt-1 max-w-md text-xs text-muted-foreground">{issue.finding}</p></td><td className="px-4 py-3">{issue.severity}</td><td className="px-4 py-3">{issue.location}</td><td className="max-w-sm px-4 py-3 text-xs">{issue.status}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${issue.unresolved ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>{state}</span></td></tr>; })}</tbody></table></div>
      </section>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="rounded-xl border bg-card p-4"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-xs font-semibold uppercase">{label}</span></div><p className="mt-3 text-2xl font-extrabold">{value}</p></div>;
}
