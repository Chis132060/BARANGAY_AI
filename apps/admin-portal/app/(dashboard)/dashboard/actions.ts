"use server";

import { createClient } from "@/lib/supabase/server";

export interface DocumentStats {
  totalRequests: number;
  pendingRequests: number;
  readyForPickup: number;
  completedRequests: number;
  totalRevenue: number;
  byType: { name: string; count: number }[];
}

export interface DashboardMetrics {
  totalPopulation: number;
  totalHouseholds: number;
  registeredVoters: number;
  seniorCitizens: number;
  pwdResidents: number;
  fourPsMembers: number;
  pendingRequests: number;
  readyForPickupRequests: number;
  completedRequests: number;
  registeredBusinesses: number;
  pendingRegistrations: number;
  totalRevenue: number;
  // Gender breakdown
  maleResidents: number;
  femaleResidents: number;
  otherGenderResidents: number;
  // Civil status
  singleResidents: number;
  marriedResidents: number;
  widowedResidents: number;
  divorcedResidents: number;
  // Sectoral
  soloParentResidents: number;
  dswdResidents: number;
  // Youth (15-30)
  youthResidents: number;
  // Completion rate
  completionRate: number;
}

export interface MonthlyTransactionItem {
  month: string;
  transactions: number;
}

export interface AgeDistItem {
  range: string;
  count: number;
}

export interface CivilStatusItem {
  status: string;
  count: number;
}

export interface PurokPopItem {
  purok: string;
  count: number;
}

export interface DocTypeItem {
  name: string;
  count: number;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  time: string;
  type: "document" | "resident";
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = createClient();

  const queryResults = await Promise.all([
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified"),
    supabase.from("households").select("*", { count: "exact", head: true }),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("voter_status", true),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("senior_status", true),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("pwd_status", true),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("four_ps_status", true),
    supabase.from("document_requests").select("*", { count: "exact", head: true }).eq("status", "Pending"),
    supabase.from("document_requests").select("*", { count: "exact", head: true }).or("status.eq.Ready for Pickup,status.eq.Approved"),
    supabase.from("document_requests").select("*", { count: "exact", head: true }).or("status.eq.Released,status.eq.Completed"),
    supabase.from("document_requests").select("*", { count: "exact", head: true }),
    supabase.from("businesses").select("*", { count: "exact", head: true }).eq("status", "Active"),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Pending"),
    supabase.from("document_requests").select("fee_amount, payment_status").or("payment_status.eq.Paid,status.eq.Completed,status.eq.Released"),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("gender", "Male"),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("gender", "Female"),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("gender", "Other"),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("civil_status", "Single"),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("civil_status", "Married"),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("civil_status", "Widowed"),
    supabase.from("residents").select("*", { count: "exact", head: true }).eq("verification_status", "Verified").eq("civil_status", "Divorced"),
    supabase.from("residents").select("birth_date").eq("verification_status", "Verified"),
  ]);

  const dashboardErrors = queryResults.flatMap((result: any) => result.error ? [result.error] : []);
  if (dashboardErrors.length) {
    throw new Error(`Dashboard metrics unavailable: ${dashboardErrors.map((error: any) => error.message).join("; ")}`);
  }

  const [
    { count: totalPopulation },
    { count: totalHouseholds },
    { count: registeredVoters },
    { count: seniorCitizens },
    { count: pwdResidents },
    { count: fourPsMembers },
    { count: pendingRequests },
    { count: readyForPickupRequests },
    { count: completedRequests },
    { count: totalRequests },
    { count: registeredBusinesses },
    { count: pendingRegistrations },
    { data: revenueData },
    { count: maleResidents },
    { count: femaleResidents },
    { count: otherGenderResidents },
    { count: singleResidents },
    { count: marriedResidents },
    { count: widowedResidents },
    { count: divorcedResidents },
    { data: youthData },
  ] = queryResults;


  const totalRev = (revenueData || []).reduce((acc: number, curr: any) => acc + (Number(curr.fee_amount) || 0), 0);

  // Compute youth count (age 15-30)
  const today = new Date();
  const youthCount = (youthData || []).filter((r: any) => {
    if (!r.birth_date) return false;
    const bd = new Date(r.birth_date);
    let age = today.getFullYear() - bd.getFullYear();
    if (today < new Date(today.getFullYear(), bd.getMonth(), bd.getDate())) age -= 1;
    return age >= 15 && age <= 30;
  }).length;

  const totalReq = totalRequests || 0;
  const completed = completedRequests || 0;
  const completionRate = totalReq > 0 ? Math.round((completed / totalReq) * 100) : 0;

  return {
    totalPopulation: totalPopulation || 0,
    totalHouseholds: totalHouseholds || 0,
    // The current schema stores households, not family units.
    registeredVoters: registeredVoters || 0,
    seniorCitizens: seniorCitizens || 0,
    pwdResidents: pwdResidents || 0,
    fourPsMembers: fourPsMembers || 0,
    pendingRequests: pendingRequests || 0,
    readyForPickupRequests: readyForPickupRequests || 0,
    completedRequests: completedRequests || 0,
    registeredBusinesses: registeredBusinesses || 0,
    pendingRegistrations: pendingRegistrations || 0,
    totalRevenue: totalRev || 0,
    maleResidents: maleResidents || 0,
    femaleResidents: femaleResidents || 0,
    otherGenderResidents: otherGenderResidents || 0,
    singleResidents: singleResidents || 0,
    marriedResidents: marriedResidents || 0,
    widowedResidents: widowedResidents || 0,
    divorcedResidents: divorcedResidents || 0,
    // These classifications are not stored in the current residents schema.
    soloParentResidents: 0,
    dswdResidents: 0,
    youthResidents: youthCount,
    completionRate,
  };
}



export async function fetchMonthlyTransactions(): Promise<MonthlyTransactionItem[]> {
  const supabase = createClient();
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const { data, error } = await supabase
    .from("document_requests")
    .select("requested_date")
    .gte("requested_date", firstMonth.toISOString());
  if (error) throw new Error(error.message);

  const months: MonthlyTransactionItem[] = [];
  for (let offset = 0; offset < 12; offset += 1) {
    const monthDate = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + offset, 1);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      month: monthDate.toLocaleDateString("en-US", { month: "short" }),
      transactions: (data || []).filter((item: any) => {
        const date = new Date(item.requested_date);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === monthKey;
      }).length,
    });
  }
  return months;
}

export async function fetchAgeDistribution(): Promise<AgeDistItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("residents").select("birth_date").eq("verification_status", "Verified");
  if (error) throw new Error(error.message);
  const distribution = [
    { range: "0-12", count: 0 },
    { range: "13-19", count: 0 },
    { range: "20-39", count: 0 },
    { range: "40-59", count: 0 },
    { range: "60+", count: 0 },
  ];
  const today = new Date();
  for (const resident of data || []) {
    if (!resident.birth_date) continue;
    const birthDate = new Date(resident.birth_date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const beforeBirthday = today < new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (beforeBirthday) age -= 1;
    const bucket = age <= 12 ? 0 : age <= 19 ? 1 : age <= 39 ? 2 : age <= 59 ? 3 : 4;
    distribution[bucket].count += 1;
  }
  return distribution;
}

export async function fetchRecentActivities(): Promise<RecentActivityItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_requests")
    .select("id,status,requested_date,document_type:document_types(name),resident:residents(first_name,last_name,addresses(purok))")
    .order("requested_date", { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);

  return (data || []).map((item: any) => {
    const resident = Array.isArray(item.resident) ? item.resident[0] : item.resident;
    const documentType = Array.isArray(item.document_type) ? item.document_type[0] : item.document_type;
    const address = Array.isArray(resident?.addresses) ? resident.addresses[0] : resident?.addresses;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - new Date(item.requested_date).getTime()) / 60000));
    return {
      id: item.id,
      title: documentType?.name || "Barangay Document Request",
      subtitle: resident ? `${resident.first_name} ${resident.last_name} (${address?.purok || "Barangay Resident"})` : "Online Applicant",
      status: item.status,
      time: elapsedMinutes < 60 ? `${elapsedMinutes}m ago` : `${Math.round(elapsedMinutes / 60)}h ago`,
      type: "document" as const,
    };
  });
}

export async function fetchPurokPopulation(): Promise<PurokPopItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("addresses")
    .select("purok");
  if (error) return [];

  const tally: Record<string, number> = {};
  for (const row of data || []) {
    const p = (row.purok || "Unassigned").trim();
    tally[p] = (tally[p] || 0) + 1;
  }

  return Object.entries(tally)
    .map(([purok, count]) => ({ purok, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function fetchTopDocumentTypes(): Promise<DocTypeItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("document_requests")
    .select("document_type:document_types(name)");
  if (error) return [];

  const tally: Record<string, number> = {};
  for (const row of data || []) {
    const dt = Array.isArray(row.document_type) ? row.document_type[0] : row.document_type;
    const name = dt?.name || "Unknown";
    tally[name] = (tally[name] || 0) + 1;
  }

  return Object.entries(tally)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);
}
