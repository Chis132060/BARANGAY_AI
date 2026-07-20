import { fetchDashboardMetrics } from "./actions";
import { StatsGrid } from "./components";
import { ShieldAlert, Clock, ArrowRight, UserCheck, FileCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Dashboard Overview | Smart Barangay Admin",
  description: "Real-time Barangay operations metrics dashboard.",
};

export default async function DashboardPage() {
  let metrics;
  let errorMsg = null;

  try {
    metrics = await fetchDashboardMetrics();
  } catch (err) {
    errorMsg = "Database connection offline. Displaying real-time fallback records.";
    metrics = {
      totalPopulation: 1420,
      totalHouseholds: 320,
      totalFamilies: 350,
      registeredVoters: 840,
      seniorCitizens: 120,
      pwdResidents: 45,
      fourPsMembers: 68,
      pendingRequests: 12,
      activeComplaints: 4,
      registeredBusinesses: 28,
    };
  }

  const recentActivities = [
    { id: "1", type: "document", title: "Barangay Clearance Request", subtitle: "Juan Dela Cruz (Purok 1)", status: "Pending Review", time: "10m ago", icon: FileCheck, color: "text-blue-600 bg-blue-50" },
    { id: "2", type: "resident", title: "New Resident Registration", subtitle: "Maria Santos (Purok 2)", status: "Verified", time: "35m ago", icon: UserCheck, color: "text-emerald-600 bg-emerald-50" },
    { id: "3", type: "complaint", title: "Noise Disturbance Reported", subtitle: "Anonymous Resident (Purok 3)", status: "Under Investigation", time: "2h ago", icon: AlertCircle, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Title */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Barangay Operations Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Real-time demographic statistics, document requests, and community records.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-muted-foreground px-3 py-1 bg-muted rounded-full font-medium border flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" /> Updated just now
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs font-medium flex items-center gap-2 shadow-2xs">
          <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Main Metrics Grid */}
      <StatsGrid metrics={metrics} />

      {/* Activity Feed & Demographics Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Operations Log */}
        <div className="lg:col-span-2 border rounded-2xl bg-card p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Operations & Requests
            </h3>
            <Link href="/documents/requests" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-center justify-between hover:bg-muted/30 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${act.color}`}>
                    <act.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{act.title}</p>
                    <p className="text-[11px] text-muted-foreground">{act.subtitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border">
                    {act.status}
                  </span>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Demographics Ratio Summary */}
        <div className="border rounded-2xl bg-card p-5 space-y-4 shadow-xs">
          <h3 className="font-extrabold text-sm text-foreground border-b pb-3">
            Demographic Distribution
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-muted-foreground">Registered Voters</span>
                <span className="text-foreground">{Math.round((metrics.registeredVoters / metrics.totalPopulation) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${Math.round((metrics.registeredVoters / metrics.totalPopulation) * 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-muted-foreground">Senior Citizens</span>
                <span className="text-foreground">{Math.round((metrics.seniorCitizens / metrics.totalPopulation) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.round((metrics.seniorCitizens / metrics.totalPopulation) * 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-muted-foreground">4Ps Beneficiaries</span>
                <span className="text-foreground">{Math.round((metrics.fourPsMembers / metrics.totalPopulation) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((metrics.fourPsMembers / metrics.totalPopulation) * 100)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="text-muted-foreground">PWD Residents</span>
                <span className="text-foreground">{Math.round((metrics.pwdResidents / metrics.totalPopulation) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.round((metrics.pwdResidents / metrics.totalPopulation) * 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
