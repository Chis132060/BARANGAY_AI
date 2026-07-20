"use client";

import { Users, Home, Award, HelpCircle, FileText, AlertTriangle, Briefcase, TrendingUp, TrendingDown, ArrowUpRight, ShieldCheck, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: any;
  description: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorClass: string;
}

export function MetricCard({ title, value, icon: Icon, description, trend, colorClass }: MetricCardProps) {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 space-y-3 relative overflow-hidden group">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl ${colorClass} transition-transform group-hover:scale-110`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-extrabold tracking-tight text-foreground">{value}</h3>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${trend.isPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {trend.isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {trend.value}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 leading-normal">{description}</p>
      </div>

      <div className="w-full bg-muted/50 h-1.5 rounded-full overflow-hidden">
        <div className="bg-primary h-full rounded-full w-2/3 opacity-75" />
      </div>
    </div>
  );
}

interface StatsGridProps {
  metrics: {
    totalPopulation: number;
    totalHouseholds: number;
    registeredVoters: number;
    seniorCitizens: number;
    pwdResidents: number;
    fourPsMembers: number;
    pendingRequests: number;
    activeComplaints: number;
    registeredBusinesses: number;
  };
}

export function StatsGrid({ metrics }: StatsGridProps) {
  const cards = [
    {
      title: "Total Population",
      value: metrics.totalPopulation.toLocaleString(),
      icon: Users,
      description: "Verified residents in barangay database",
      trend: { value: "+5.2%", isPositive: true },
      colorClass: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
    },
    {
      title: "Households",
      value: metrics.totalHouseholds.toLocaleString(),
      icon: Home,
      description: "Registered residential household units",
      trend: { value: "+2.1%", isPositive: true },
      colorClass: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    },
    {
      title: "Registered Voters",
      value: metrics.registeredVoters.toLocaleString(),
      icon: Award,
      description: "COMELEC registered voters in precinct",
      trend: { value: "+8.4%", isPositive: true },
      colorClass: "bg-purple-500/10 text-purple-600 border border-purple-500/20",
    },
    {
      title: "Senior Citizens",
      value: metrics.seniorCitizens.toLocaleString(),
      icon: Sparkles,
      description: "OSCA registered senior pensioners",
      trend: { value: "+1.5%", isPositive: true },
      colorClass: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    },
    {
      title: "PWD Members",
      value: metrics.pwdResidents.toLocaleString(),
      icon: HelpCircle,
      description: "Persons with Disability registered",
      trend: { value: "0%", isPositive: true },
      colorClass: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
    },
    {
      title: "Pending Requests",
      value: metrics.pendingRequests,
      icon: FileText,
      description: "Document clearances awaiting approval",
      trend: { value: "-12%", isPositive: true },
      colorClass: "bg-sky-500/10 text-sky-600 border border-sky-500/20",
    },
    {
      title: "Active Complaints",
      value: metrics.activeComplaints,
      icon: AlertTriangle,
      description: "Open Katarungang Pambarangay cases",
      trend: { value: "+2 cases", isPositive: false },
      colorClass: "bg-rose-500/10 text-rose-600 border border-rose-500/20",
    },
    {
      title: "Local Businesses",
      value: metrics.registeredBusinesses,
      icon: Briefcase,
      description: "Permitted commercial establishments",
      trend: { value: "+4.0%", isPositive: true },
      colorClass: "bg-teal-500/10 text-teal-600 border border-teal-500/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <MetricCard key={i} {...card} />
        ))}
      </div>

      {/* Quick Action Shortcuts Banner */}
      <div className="border rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1 z-10">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Quick Operations
          </span>
          <h2 className="text-xl font-extrabold tracking-tight">Barangay Admin Dashboard</h2>
          <p className="text-xs text-slate-300">Fast access to key barangay operations and management tools.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 z-10">
          <Link
            href="/residents"
            className="flex items-center gap-1.5 bg-white text-slate-900 font-bold px-4 py-2 rounded-xl text-xs hover:bg-slate-100 transition-all shadow-xs"
          >
            <Plus className="h-3.5 w-3.5 text-blue-600" /> Add Resident
          </Link>
          <Link
            href="/documents/requests"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-xs"
          >
            <FileText className="h-3.5 w-3.5" /> Issue Certificate
          </Link>
          <Link
            href="/communication/announcements"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs backdrop-blur-xs transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> New Announcement
          </Link>
        </div>
      </div>
    </div>
  );
}
