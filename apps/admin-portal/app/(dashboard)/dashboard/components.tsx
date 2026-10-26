"use client";

import {
  Users, Home, BadgeCheck, Accessibility, FileText, Building2,
  UserPlus, Receipt, PackageCheck, UserRound, AlertCircle,
  TrendingDown, TrendingUp, Minus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { DashboardMetrics } from "./actions";

// ─── Tiny inline sparkline SVG ────────────────────────────────────────────────
function Sparkline({ color = "#94a3b8", up = true }: { color?: string; up?: boolean }) {
  const points = up
    ? "0,18 8,14 16,16 24,10 32,12 40,6 48,8 56,3 64,6"
    : "0,6 8,8 16,4 24,10 32,8 40,14 48,12 56,16 64,18";
  return (
    <svg width="64" height="24" viewBox="0 0 64 24" fill="none" className="opacity-70">
      <polyline points={points} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── KPI Hero Card ─────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  deltaType?: "up" | "down" | "neutral";
  href: string;
  accentColor: string;
  bgColor: string;
  sparkColor?: string;
}

export function KpiCard({
  label, value, icon: Icon, delta, deltaType = "neutral",
  href, accentColor, bgColor, sparkColor = "#94a3b8",
}: KpiCardProps) {
  const DeltaIcon = deltaType === "up" ? TrendingUp : deltaType === "down" ? TrendingDown : Minus;

  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className={`p-2.5 rounded-xl ${bgColor} ${accentColor} transition-transform group-hover:scale-110`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-extrabold tracking-tight text-foreground leading-none">{value}</span>
        <Sparkline color={sparkColor} up={deltaType !== "down"} />
      </div>

      {delta && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <DeltaIcon className="h-3 w-3" />
          <span>{delta}</span>
        </div>
      )}
    </Link>
  );
}

// ─── Gender Split Bar ──────────────────────────────────────────────────────────
function GenderSplitBar({ male, female, other, total }: { male: number; female: number; other: number; total: number }) {
  const pctM = total > 0 ? (male / total) * 100 : 0;
  const pctF = total > 0 ? (female / total) * 100 : 0;
  const pctO = total > 0 ? (other / total) * 100 : 0;
  return (
    <div className="space-y-3">
      {/* Stacked split bar */}
      <div className="flex h-4 w-full rounded-full overflow-hidden gap-0.5">
        <div className="h-full bg-blue-500 transition-all duration-700 rounded-l-full" style={{ width: `${pctM}%` }} />
        <div className="h-full bg-rose-400 transition-all duration-700" style={{ width: `${pctF}%` }} />
        <div className="h-full bg-slate-400 transition-all duration-700 rounded-r-full" style={{ width: `${pctO}%` }} />
      </div>
      {/* Legend rows */}
      {[
        { label: "Male", value: male, pct: pctM, color: "bg-blue-500", dot: "#3b82f6" },
        { label: "Female", value: female, pct: pctF, color: "bg-rose-400", dot: "#fb7185" },
        { label: "Other / Unspecified", value: other, pct: pctO, color: "bg-slate-400", dot: "#94a3b8" },
      ].map(({ label, value, pct, dot }) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: dot }} />
          <span className="flex-1 font-medium text-muted-foreground">{label}</span>
          <span className="tabular-nums text-muted-foreground">{value.toLocaleString()}</span>
          <span className="tabular-nums font-bold text-foreground w-10 text-right">{Math.round(pct)}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Horizontal Metric Bar Row ─────────────────────────────────────────────────
interface MetricRowProps {
  label: string;
  value: number;
  max: number;
  color: string;
  href: string;
}

export function MetricRow({ label, value, max, color, href }: MetricRowProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-muted/40 transition-colors"
    >
      <span className="w-36 shrink-0 text-xs font-medium text-muted-foreground truncate group-hover:text-foreground transition-colors">
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: pct > 0 ? `${pct}%` : "2%" }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground">
        {value.toLocaleString()}
      </span>
    </Link>
  );
}

// ─── SVG Donut Chart ───────────────────────────────────────────────────────────
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const r = 64;
  const cx = 80;
  const cy = 80;
  const circ = 2 * Math.PI * r;
  let cumPct = 0;

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(220 14% 92%)" strokeWidth="20" />
      {segments.map((seg, i) => {
        const pct = total > 0 ? seg.value / total : 0;
        const dash = pct * circ;
        const gap = circ - dash;
        const rotation = -90 + cumPct * 360;
        cumPct += pct;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="20"
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotation} ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="800" fontFamily="inherit">
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="inherit">TOTAL</text>
    </svg>
  );
}

// ─── Action Banner (horizontal, urgent) ───────────────────────────────────────
interface ActionBannerProps {
  title: string;
  value: number;
  icon: LucideIcon;
  description: string;
  href: string;
  badge?: string;
  urgent?: boolean;
}

export function ActionBanner({ title, value, icon: Icon, description, href, badge, urgent }: ActionBannerProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-border p-4 bg-card shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className={`p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${urgent && value > 0 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40" : "bg-blue-50 text-blue-600 dark:bg-blue-950/30"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{title}</p>
        <p className="text-2xl font-extrabold tracking-tight text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-1 truncate">{description}</p>
      </div>
      {badge && value > 0 && (
        <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${urgent ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"}`}>
          <AlertCircle className="h-3 w-3" />
          {badge}
        </span>
      )}
    </Link>
  );
}

// ─── Revenue Banner ────────────────────────────────────────────────────────────
export function RevenueBanner({ value, description, href }: { value: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    >
      <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 shrink-0 transition-transform group-hover:scale-110">
        <Receipt className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Document Fees Revenue</p>
        <p className="text-2xl font-extrabold tracking-tight text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 truncate">{description}</p>
      </div>
      <TrendingUp className="h-5 w-5 text-emerald-500 shrink-0" />
    </Link>
  );
}

// ─── Full StatsGrid ────────────────────────────────────────────────────────────
interface StatsGridProps {
  metrics: DashboardMetrics;
}

export function StatsGrid({ metrics }: StatsGridProps) {
  const pop = Math.max(1, metrics.totalPopulation);

  const donutSegments: DonutSegment[] = [
    { label: "Voters", value: metrics.registeredVoters, color: "#7c3aed" },
    { label: "Seniors", value: metrics.seniorCitizens, color: "#f59e0b" },
    { label: "4Ps", value: metrics.fourPsMembers, color: "#10b981" },
    { label: "PWD", value: metrics.pwdResidents, color: "#6366f1" },
    { label: "Solo Parent", value: metrics.soloParentResidents, color: "#ec4899" },
    { label: "DSWD", value: metrics.dswdResidents, color: "#0ea5e9" },
    {
      label: "Others",
      value: Math.max(0, pop - metrics.registeredVoters - metrics.seniorCitizens - metrics.fourPsMembers - metrics.pwdResidents - metrics.soloParentResidents - metrics.dswdResidents),
      color: "#e2e8f0",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Row 1: KPI Hero Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Total Population" value={metrics.totalPopulation.toLocaleString()} icon={Users} delta="Registered residents" deltaType="neutral" href="/residents" accentColor="text-blue-600" bgColor="bg-blue-50 dark:bg-blue-950/30" sparkColor="#3b82f6" />
        <KpiCard label="Households" value={metrics.totalHouseholds.toLocaleString()} icon={Home} delta="Family units" deltaType="neutral" href="/residents/household" accentColor="text-emerald-600" bgColor="bg-emerald-50 dark:bg-emerald-950/30" sparkColor="#10b981" />
        <KpiCard label="Registered Voters" value={metrics.registeredVoters.toLocaleString()} icon={BadgeCheck} delta={`${Math.round((metrics.registeredVoters / pop) * 100)}% of pop.`} deltaType="up" href="/community/precinct" accentColor="text-violet-600" bgColor="bg-violet-50 dark:bg-violet-950/30" sparkColor="#7c3aed" />
        <KpiCard label="Senior Citizens" value={metrics.seniorCitizens.toLocaleString()} icon={UserRound} delta={`${Math.round((metrics.seniorCitizens / pop) * 100)}% of pop.`} deltaType="neutral" href="/residents/senior" accentColor="text-amber-600" bgColor="bg-amber-50 dark:bg-amber-950/30" sparkColor="#f59e0b" />
        <KpiCard label="PWD Members" value={metrics.pwdResidents.toLocaleString()} icon={Accessibility} delta={`${Math.round((metrics.pwdResidents / pop) * 100)}% of pop.`} deltaType="neutral" href="/residents/pwd" accentColor="text-indigo-600" bgColor="bg-indigo-50 dark:bg-indigo-950/30" sparkColor="#6366f1" />
        <KpiCard label="Local Businesses" value={metrics.registeredBusinesses.toLocaleString()} icon={Building2} delta="Active permits" deltaType="up" href="/business/registry" accentColor="text-teal-600" bgColor="bg-teal-50 dark:bg-teal-950/30" sparkColor="#14b8a6" />
      </div>

      {/* ── Row 2: Requires Action banners (horizontal) ── */}
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          Requires Action
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionBanner
            title="Pending Registrations"
            value={metrics.pendingRegistrations}
            icon={UserPlus}
            description="Self-registered residents awaiting verification"
            href="/residents/verification"
            badge="Needs review"
            urgent
          />
          <ActionBanner
            title="Pending Requests"
            value={metrics.pendingRequests}
            icon={FileText}
            description="Applications awaiting staff review & approval"
            href="/documents/requests"
            badge="Queue active"
            urgent
          />
          <ActionBanner
            title="Ready for Pickup"
            value={metrics.readyForPickupRequests ?? 0}
            icon={PackageCheck}
            description="Processed certificates ready for release"
            href="/documents/requests"
            badge="Awaiting resident"
          />
          <RevenueBanner
            value={`₱${(metrics.totalRevenue ?? 0).toLocaleString()}`}
            description="Total fees collected from issued documents"
            href="/documents/requests"
          />
        </div>
      </div>

      {/* ── Row 3: Chart panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Community breakdown horizontal bar chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs space-y-1">
          <p className="text-sm font-extrabold text-foreground mb-4">Community Breakdown</p>
          <MetricRow label="Total Population" value={metrics.totalPopulation} max={pop} color="bg-blue-500" href="/residents" />
          <MetricRow label="Households" value={metrics.totalHouseholds} max={pop} color="bg-emerald-500" href="/residents/household" />
          <MetricRow label="Registered Voters" value={metrics.registeredVoters} max={pop} color="bg-violet-500" href="/community/precinct" />
          <MetricRow label="Senior Citizens" value={metrics.seniorCitizens} max={pop} color="bg-amber-500" href="/residents/senior" />
          <MetricRow label="4Ps Beneficiaries" value={metrics.fourPsMembers} max={pop} color="bg-teal-500" href="/residents" />
          <MetricRow label="PWD Members" value={metrics.pwdResidents} max={pop} color="bg-indigo-500" href="/residents/pwd" />
          <MetricRow label="Solo Parents" value={metrics.soloParentResidents} max={pop} color="bg-pink-500" href="/residents" />
          <MetricRow label="DSWD Beneficiaries" value={metrics.dswdResidents} max={pop} color="bg-sky-500" href="/residents" />
          <MetricRow label="Local Businesses" value={metrics.registeredBusinesses} max={pop} color="bg-orange-400" href="/business/registry" />
          <div className="pt-2 border-t border-border/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">By Gender</p>
            <MetricRow label="Male" value={metrics.maleResidents} max={pop} color="bg-blue-500" href="/residents" />
            <MetricRow label="Female" value={metrics.femaleResidents} max={pop} color="bg-rose-400" href="/residents" />
            <MetricRow label="Other / Unspecified" value={metrics.otherGenderResidents} max={pop} color="bg-slate-400" href="/residents" />
          </div>
        </div>

        {/* Demographic donut + improved legend */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-5">
          <p className="text-sm font-extrabold text-foreground">Demographic Distribution</p>

          {/* Donut centered, larger */}
          <div className="flex justify-center">
            <DonutChart segments={donutSegments} total={metrics.totalPopulation} />
          </div>

          {/* Full-width legend rows with mini bars, counts, and percentages */}
          <div className="space-y-2.5">
            {[
              { label: "Registered Voters", value: metrics.registeredVoters, color: "#7c3aed", barColor: "bg-violet-500" },
              { label: "Senior Citizens", value: metrics.seniorCitizens, color: "#f59e0b", barColor: "bg-amber-500" },
              { label: "4Ps Beneficiaries", value: metrics.fourPsMembers, color: "#10b981", barColor: "bg-emerald-500" },
              { label: "PWD Members", value: metrics.pwdResidents, color: "#6366f1", barColor: "bg-indigo-500" },
              { label: "Solo Parents", value: metrics.soloParentResidents, color: "#ec4899", barColor: "bg-pink-500" },
              { label: "DSWD Beneficiaries", value: metrics.dswdResidents, color: "#0ea5e9", barColor: "bg-sky-500" },
              {
                label: "Others",
                value: Math.max(0, pop - metrics.registeredVoters - metrics.seniorCitizens - metrics.fourPsMembers - metrics.pwdResidents - metrics.soloParentResidents - metrics.dswdResidents),
                color: "#cbd5e1",
                barColor: "bg-slate-300",
              },
            ].map(({ label, value, color, barColor }) => {
              const pct = Math.round((value / pop) * 100);
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="flex-1 font-medium text-muted-foreground">{label}</span>
                    <span className="tabular-nums text-muted-foreground font-normal">{value.toLocaleString()}</span>
                    <span className="tabular-nums font-bold text-foreground w-9 text-right">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all duration-700`}
                      style={{ width: pct > 0 ? `${pct}%` : "1%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Gender Distribution panel ── */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-extrabold text-foreground">Gender Distribution</p>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {metrics.totalPopulation.toLocaleString()} residents
            </span>
          </div>

          {/* Donut for gender */}
          <div className="flex justify-center">
            <DonutChart
              segments={[
                { label: "Male", value: metrics.maleResidents, color: "#3b82f6" },
                { label: "Female", value: metrics.femaleResidents, color: "#fb7185" },
                { label: "Other", value: metrics.otherGenderResidents, color: "#94a3b8" },
              ]}
              total={metrics.totalPopulation}
            />
          </div>

          {/* Split stacked bar + legend */}
          <GenderSplitBar
            male={metrics.maleResidents}
            female={metrics.femaleResidents}
            other={metrics.otherGenderResidents}
            total={pop}
          />

          {/* Male vs Female ratio callout */}
          {metrics.maleResidents + metrics.femaleResidents > 0 && (
            <div className="mt-auto pt-3 border-t border-border/50 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1">
                <span className="font-bold text-blue-500">♂ {metrics.maleResidents}</span>
                <span className="mx-1">vs</span>
                <span className="font-bold text-rose-400">♀ {metrics.femaleResidents}</span>
              </div>
              <span className="font-semibold text-foreground">
                {metrics.maleResidents > metrics.femaleResidents
                  ? `+${metrics.maleResidents - metrics.femaleResidents} more male`
                  : metrics.femaleResidents > metrics.maleResidents
                    ? `+${metrics.femaleResidents - metrics.maleResidents} more female`
                    : "Equal ratio"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
