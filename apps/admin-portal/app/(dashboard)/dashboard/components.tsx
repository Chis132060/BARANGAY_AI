"use client";

import {
  Users, Home, BadgeCheck, Accessibility, FileText, Building2,
  UserPlus, Receipt, PackageCheck, UserRound, AlertCircle,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";

// ─── Action Card (urgent, requires staff attention) ──────────────────────────
interface ActionCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
  href: string;
  accentColor: "amber" | "sky" | "emerald";
  badge?: string;
}

const accentMap = {
  amber: {
    border: "border-l-amber-400",
    icon: "bg-amber-50 text-amber-600 border border-amber-200",
    pulse: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
    value: "text-amber-700",
  },
  sky: {
    border: "border-l-sky-400",
    icon: "bg-sky-50 text-sky-600 border border-sky-200",
    pulse: "bg-sky-400",
    badge: "bg-sky-100 text-sky-700",
    value: "text-sky-700",
  },
  emerald: {
    border: "border-l-emerald-400",
    icon: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    pulse: "bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    value: "text-emerald-700",
  },
};

export function ActionCard({ title, value, icon: Icon, description, href, accentColor, badge }: ActionCardProps) {
  const colors = accentMap[accentColor];
  const isUrgent = value > 0;

  return (
    <Link
      href={href}
      aria-label={`Open ${title}`}
      className={`block bg-card rounded-2xl p-5 border border-border border-l-4 ${colors.border} shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 space-y-3 relative overflow-hidden group`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
          {isUrgent && (
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.pulse} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.pulse}`} />
            </span>
          )}
        </div>
        <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${colors.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div>
        <h3 className={`text-3xl font-extrabold tracking-tight ${isUrgent ? colors.value : "text-foreground"}`}>
          {value}
        </h3>
        <p className="text-[11px] text-muted-foreground mt-1 leading-normal">{description}</p>
      </div>

      {badge && (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
          <AlertCircle className="h-2.5 w-2.5" />
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Revenue Card ─────────────────────────────────────────────────────────────
interface RevenueCardProps {
  value: string;
  icon: LucideIcon;
  description: string;
  href: string;
}

export function RevenueCard({ value, icon: Icon, description, href }: RevenueCardProps) {
  return (
    <Link
      href={href}
      aria-label="Document Fees Revenue"
      className="block bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 shadow-xs hover:shadow-lg transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 space-y-3 relative overflow-hidden group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">Document Fees Revenue</span>
        <div className="p-2.5 rounded-xl bg-white/20 text-white transition-transform group-hover:scale-110">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <h3 className="text-3xl font-extrabold tracking-tight text-white">{value}</h3>
        <p className="text-[11px] text-emerald-100/80 mt-1 leading-normal">{description}</p>
      </div>
      <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
    </Link>
  );
}

// ─── Stat Card (passive demographic metric) ───────────────────────────────────
interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description: string;
  href: string;
  colorClass: string;
  fillPercent?: number;
}

export function StatCard({ title, value, icon: Icon, description, href, colorClass, fillPercent }: StatCardProps) {
  const fill = Math.min(100, Math.max(0, fillPercent ?? 0));

  return (
    <Link
      href={href}
      aria-label={`Open ${title}`}
      className="block bg-card rounded-2xl p-5 border border-border shadow-xs hover:shadow-md transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 space-y-3 relative overflow-hidden group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl transition-transform group-hover:scale-110 ${colorClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div>
        <h3 className="text-3xl font-extrabold tracking-tight text-foreground">{value}</h3>
        <p className="text-[11px] text-muted-foreground mt-1 leading-normal">{description}</p>
      </div>

      <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary/50 transition-all duration-700"
          style={{ width: fill > 0 ? `${fill}%` : "4%" }}
        />
      </div>
    </Link>
  );
}

// ─── StatsGrid ────────────────────────────────────────────────────────────────
import type { DashboardMetrics } from "./actions";

interface StatsGridProps {
  metrics: DashboardMetrics;
}

export function StatsGrid({ metrics }: StatsGridProps) {
  const pop = Math.max(1, metrics.totalPopulation);

  return (
    <div className="space-y-6">
      {/* Action Cards — require staff attention */}
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
          Requires Action
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard
            title="Pending Registrations"
            value={metrics.pendingRegistrations}
            icon={UserPlus}
            description="Self-registered residents awaiting verification"
            href="/residents/verification"
            accentColor="amber"
            badge={metrics.pendingRegistrations > 0 ? "Needs review" : undefined}
          />
          <ActionCard
            title="Pending Document Requests"
            value={metrics.pendingRequests}
            icon={FileText}
            description="Applications awaiting staff review & approval"
            href="/documents/requests"
            accentColor="sky"
            badge={metrics.pendingRequests > 0 ? "Queue active" : undefined}
          />
          <ActionCard
            title="Ready for Pickup"
            value={metrics.readyForPickupRequests ?? 0}
            icon={PackageCheck}
            description="Processed certificates ready for release"
            href="/documents/requests"
            accentColor="emerald"
            badge={(metrics.readyForPickupRequests ?? 0) > 0 ? "Awaiting resident" : undefined}
          />
          <RevenueCard
            value={`₱${(metrics.totalRevenue ?? 0).toLocaleString()}`}
            icon={Receipt}
            description="Total fees collected from issued documents"
            href="/documents/requests"
          />
        </div>
      </div>

      {/* Stat Cards — demographic overview */}
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
          Community Overview
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Population"
            value={metrics.totalPopulation.toLocaleString()}
            icon={Users}
            description="Verified residents in database"
            href="/residents"
            colorClass="bg-blue-500/10 text-blue-600 border border-blue-500/20"
            fillPercent={100}
          />
          <StatCard
            title="Households"
            value={metrics.totalHouseholds.toLocaleString()}
            icon={Home}
            description="Registered household units"
            href="/residents/household"
            colorClass="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            fillPercent={metrics.totalHouseholds > 0 ? Math.round((metrics.totalHouseholds / pop) * 100 * 4) : 0}
          />
          <StatCard
            title="Registered Voters"
            value={metrics.registeredVoters.toLocaleString()}
            icon={BadgeCheck}
            description="COMELEC registered voters"
            href="/community/precinct"
            colorClass="bg-purple-500/10 text-purple-600 border border-purple-500/20"
            fillPercent={Math.round((metrics.registeredVoters / pop) * 100)}
          />
          <StatCard
            title="Senior Citizens"
            value={metrics.seniorCitizens.toLocaleString()}
            icon={UserRound}
            description="OSCA registered pensioners"
            href="/residents/senior"
            colorClass="bg-amber-500/10 text-amber-600 border border-amber-500/20"
            fillPercent={Math.round((metrics.seniorCitizens / pop) * 100)}
          />
          <StatCard
            title="PWD Members"
            value={metrics.pwdResidents.toLocaleString()}
            icon={Accessibility}
            description="Persons with Disability"
            href="/residents/pwd"
            colorClass="bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
            fillPercent={Math.round((metrics.pwdResidents / pop) * 100)}
          />
          <StatCard
            title="Local Businesses"
            value={metrics.registeredBusinesses}
            icon={Building2}
            description="Permitted establishments"
            href="/business/registry"
            colorClass="bg-teal-500/10 text-teal-600 border border-teal-500/20"
            fillPercent={metrics.registeredBusinesses > 0 ? Math.round((metrics.registeredBusinesses / pop) * 100 * 10) : 0}
          />
        </div>
      </div>
    </div>
  );
}
