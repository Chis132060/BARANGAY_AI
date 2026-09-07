import { Download, FileSpreadsheet, Users, Receipt, Building2 } from "lucide-react";
import { fetchAgeDistribution, fetchDashboardMetrics, fetchMonthlyTransactions } from "../../dashboard/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Barangay Reports | Admin" };

function csvHref(rows: string[][]) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
}

export default async function ReportsPage() {
  const [metrics, monthly, ages] = await Promise.all([
    fetchDashboardMetrics(),
    fetchMonthlyTransactions(),
    fetchAgeDistribution(),
  ]);

  const generatedDate = new Date().toISOString().slice(0, 10);
  const reportRows = [
    ["Metric", "Value"],
    ["Total population", String(metrics.totalPopulation)],
    ["Households", String(metrics.totalHouseholds)],
    ["Senior citizens", String(metrics.seniorCitizens)],
    ["PWD residents", String(metrics.pwdResidents)],
    ["4Ps members", String(metrics.fourPsMembers)],
    ["Pending document requests", String(metrics.pendingRequests)],
    ["Completed document requests", String(metrics.completedRequests)],
    ["Registered businesses", String(metrics.registeredBusinesses)],
    ["Collected fees", `PHP ${metrics.totalRevenue.toFixed(2)}`],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barangay Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Live summaries generated from resident, request, business, and payment records.</p>
        </div>
        <a href={csvHref(reportRows)} download={`barangay-report-${generatedDate}.csv`} className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <FileSpreadsheet className="h-4 w-4" /> Download CSV
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5"><Users className="h-5 w-5 text-blue-600" /><p className="mt-3 text-xs text-muted-foreground">Population</p><p className="text-2xl font-bold">{metrics.totalPopulation.toLocaleString()}</p></div>
        <div className="rounded-xl border bg-card p-5"><Receipt className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-xs text-muted-foreground">Document fees collected</p><p className="text-2xl font-bold">₱{metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
        <div className="rounded-xl border bg-card p-5"><Building2 className="h-5 w-5 text-amber-600" /><p className="mt-3 text-xs text-muted-foreground">Active businesses</p><p className="text-2xl font-bold">{metrics.registeredBusinesses.toLocaleString()}</p></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b px-5 py-4"><h2 className="font-bold">Requests by Month</h2><p className="text-xs text-muted-foreground">Last 12 months from document request records</p></div>
          <table className="w-full text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-left">Month</th><th className="px-5 py-3 text-right">Requests</th></tr></thead><tbody className="divide-y">{monthly.map((row) => <tr key={row.month}><td className="px-5 py-3">{row.month}</td><td className="px-5 py-3 text-right font-semibold">{row.transactions}</td></tr>)}</tbody></table>
        </section>
        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="border-b px-5 py-4"><h2 className="font-bold">Resident Age Distribution</h2><p className="text-xs text-muted-foreground">Calculated from resident birth dates</p></div>
          <table className="w-full text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-left">Age range</th><th className="px-5 py-3 text-right">Residents</th></tr></thead><tbody className="divide-y">{ages.map((row) => <tr key={row.range}><td className="px-5 py-3">{row.range}</td><td className="px-5 py-3 text-right font-semibold">{row.count}</td></tr>)}</tbody></table>
        </section>
      </div>

      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-4"><h2 className="font-bold">Generated Report</h2><p className="text-xs text-muted-foreground">Generated {generatedDate} from live database records</p></div>
        <table className="w-full text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-left">Report</th><th className="px-5 py-3 text-left">Source</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody><tr><td className="px-5 py-4 font-medium">Barangay Operations Summary</td><td className="px-5 py-4 text-muted-foreground">Residents, documents, businesses, payments</td><td className="px-5 py-4 font-mono text-xs">{generatedDate}</td><td className="px-5 py-4 text-right"><a href={csvHref(reportRows)} download={`barangay-report-${generatedDate}.csv`} className="inline-flex items-center gap-1 text-primary text-xs font-semibold hover:underline"><Download className="h-3.5 w-3.5" /> Download</a></td></tr></tbody></table>
      </section>
    </div>
  );
}
