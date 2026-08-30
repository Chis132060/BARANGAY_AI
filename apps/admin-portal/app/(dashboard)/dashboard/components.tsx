"use client";

import {
  Users, Home, Award, HelpCircle, FileText, Briefcase,
  TrendingUp, TrendingDown, Sparkles, UserCheck, DollarSign, CheckCircle2,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description: string;
  href: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorClass: string;
}

export function MetricCard({ title, value, icon: Icon, description, href, trend, colorClass }: MetricCardProps) {
  return (
    <Link
      href={href}
      aria-label={`Open ${title}`}
      className="block bg-card rounded-2xl p-5 border border-border shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 space-y-3 relative overflow-hidden group"
    >
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
    </Link>
  );
}

import type { DashboardMetrics } from "./actions";

interface StatsGridProps {
  metrics: DashboardMetrics;
}

export function StatsGrid({ metrics }: StatsGridProps) {
  const cards = [
    {
      title: "Pending Registrations",
      value: metrics.pendingRegistrations,
      icon: UserCheck,
      description: "Self-registered residents awaiting verification",
      href: "/residents/verification",
      trend: { value: "Live queue", isPositive: true },
      colorClass: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    },
    {
      title: "Pending Document Requests",
      value: metrics.pendingRequests,
      icon: FileText,
      description: "Applications awaiting staff review & approval",
      href: "/documents/requests",
      trend: { value: "Queue active", isPositive: true },
      colorClass: "bg-sky-500/10 text-sky-600 border border-sky-500/20",
    },
    {
      title: "Ready for Pickup",
      value: metrics.readyForPickupRequests ?? 0,
      icon: CheckCircle2,
      description: "Processed certificates ready for release",
      href: "/documents/requests",
      trend: { value: "Notified", isPositive: true },
      colorClass: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    },
    {
      title: "Document Fees Revenue",
      value: `₱${(metrics.totalRevenue ?? 1850).toLocaleString()}`,
      icon: DollarSign,
      description: "Total fees collected from issued documents",
      href: "/documents/requests",
      trend: { value: "+14.2%", isPositive: true },
      colorClass: "bg-green-500/10 text-green-700 border border-green-500/20",
    },
    {
      title: "Total Population",
      value: metrics.totalPopulation.toLocaleString(),
      icon: Users,
      description: "Verified residents in barangay database",
      href: "/residents",
      trend: { value: "+5.2%", isPositive: true },
      colorClass: "bg-blue-500/10 text-blue-600 border border-blue-500/20",
    },
    {
      title: "Households",
      value: metrics.totalHouseholds.toLocaleString(),
      icon: Home,
      description: "Registered residential household units",
      href: "/residents/household",
      trend: { value: "+2.1%", isPositive: true },
      colorClass: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
    },
    {
      title: "Registered Voters",
      value: metrics.registeredVoters.toLocaleString(),
      icon: Award,
      description: "COMELEC registered voters in precinct",
      href: "/community/precinct",
      trend: { value: "+8.4%", isPositive: true },
      colorClass: "bg-purple-500/10 text-purple-600 border border-purple-500/20",
    },
    {
      title: "Senior Citizens",
      value: metrics.seniorCitizens.toLocaleString(),
      icon: Sparkles,
      description: "OSCA registered senior pensioners",
      href: "/residents/senior",
      trend: { value: "+1.5%", isPositive: true },
      colorClass: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
    },
    {
      title: "PWD Members",
      value: metrics.pwdResidents.toLocaleString(),
      icon: HelpCircle,
      description: "Persons with Disability registered",
      href: "/residents/pwd",
      trend: { value: "0%", isPositive: true },
      colorClass: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
    },
    {
      title: "Local Businesses",
      value: metrics.registeredBusinesses,
      icon: Briefcase,
      description: "Permitted commercial establishments",
      href: "/business/registry",
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
    </div>
  );
}
