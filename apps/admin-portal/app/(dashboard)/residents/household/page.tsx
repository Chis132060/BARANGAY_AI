import { AdminTable } from "@/components/ui/AdminTable";
import { fetchHouseholds, fetchResidents } from "../actions";
import { fetchHouseholdMembers } from "./actions";
import { HouseholdMembersClient } from "./HouseholdMembersClient";
import { CreateHouseholdForm } from "./CreateHouseholdForm";

export const metadata = { title: "Household Management | Admin" };

export default async function HouseholdPage() {
  let households: Awaited<ReturnType<typeof fetchHouseholds>> = [];
  let error = "";
  let residents: Awaited<ReturnType<typeof fetchResidents>> = [];
  let members: Awaited<ReturnType<typeof fetchHouseholdMembers>> = [];
  try { [households, residents, members] = await Promise.all([fetchHouseholds(), fetchResidents(), fetchHouseholdMembers()]); } catch (err: any) { error = err.message || "Unable to load household records."; }
  return <div className="space-y-6">
    <div className="border-b pb-5"><h1 className="text-3xl font-bold tracking-tight">Household Management</h1><p className="mt-1 text-sm text-muted-foreground">Household records and member counts from the barangay database. A household may contain multiple families; verify membership and head-of-household details before official reporting.</p></div>
    {!error && <CreateHouseholdForm />}
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm"><div className="overflow-x-auto"><AdminTable className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="px-6 py-3">Household No.</th><th className="px-6 py-3">Head of Family</th><th className="px-6 py-3">Housing Type</th><th className="px-6 py-3">Members</th><th className="px-6 py-3">Monthly Income</th></tr></thead><tbody className="divide-y">{households.map((household) => <tr key={household.id} className="hover:bg-muted/40"><td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{household.household_number}</td><td className="px-6 py-4 font-medium">{household.head ? `${household.head.first_name} ${household.head.last_name}` : "No head assigned"}</td><td className="px-6 py-4 text-muted-foreground">{household.housing_type || "Not recorded"}</td><td className="px-6 py-4 font-semibold">{household.member_count ?? 0}</td><td className="px-6 py-4 text-muted-foreground">₱{Number(household.monthly_income || 0).toLocaleString()}</td></tr>)}</tbody></AdminTable></div>{!error && households.map(household => <HouseholdMembersClient key={household.id} householdId={household.id} residents={residents} members={members.filter(m => m.household_id === household.id)} />)}{!error && households.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">No household records found.</p>}</div>
  </div>;
}
