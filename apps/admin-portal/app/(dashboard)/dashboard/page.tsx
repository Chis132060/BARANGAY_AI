import { fetchDashboardMetrics, fetchRecentActivities } from "./actions";
import { StatsGrid } from "./components";
import { ShieldAlert, Clock, ArrowRight, FileCheck } from "lucide-react";
import Link from "next/link";
import { DashboardRealtime } from "./components/DashboardRealtime";

export const metadata = {
  title: "Dashboard Overview | Smart Barangay Admin",
  description: "Real-time Barangay operations metrics dashboard.",
};

export default async function DashboardPage() {
  let metrics;
  let recentActivities: any[] = [];
  let errorMsg = null;

  try {
    metrics = await fetchDashboardMetrics();
    recentActivities = await fetchRecentActivities();
  } catch (err) {
    errorMsg = "Database connection is unavailable. Showing empty live metrics until the database reconnects.";
    metrics = {
      totalPopulation: 0,
      totalHouseholds: 0,
      totalFamilies: 0,
      registeredVoters: 0,
      seniorCitizens: 0,
      pwdResidents: 0,
      fourPsMembers: 0,
      pendingRequests: 0,
      readyForPickupRequests: 0,
      completedRequests: 0,
      registeredBusinesses: 0,
      pendingRegistrations: 0,
      totalRevenue: 0.0,
    };
  }


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Barangay Operations Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time demographic statistics, document requests, and community records.</p>
        </div>

      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs font-medium flex items-center gap-2 shadow-2xs">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Main Metrics Grid */}
      <DashboardRealtime />
      <StatsGrid metrics={metrics} />

      {/* Recent Operations — full-width analytics table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Recent Operations &amp; Requests
          </h3>
          <Link href="/documents/requests" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <FileCheck className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">No recent activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 px-5 py-2.5 bg-muted/40">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Document</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resident</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Time</span>
            </div>
            {(recentActivities as { id: string; title: string; subtitle: string; status: string; time: string }[]).map((act) => {
              const statusColor =
                act.status === "Pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                act.status === "Approved" || act.status === "Ready for Pickup" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                act.status === "Released" || act.status === "Completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" :
                "bg-muted text-muted-foreground";
              return (
                <div key={act.id} className="grid grid-cols-[2fr_2fr_1fr_1fr] gap-4 items-center px-5 py-3.5 hover:bg-muted/30 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 shrink-0">
                      <FileCheck className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{act.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{act.subtitle}</span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold w-fit ${statusColor}`}>
                    {act.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono text-right">{act.time}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
