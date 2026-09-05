"use client";

import { useState } from "react";
import { Briefcase, Check, Loader2, Plus, X } from "lucide-react";
import type { BusinessItem, BusinessPermitItem } from "../../actions";

type PermitStatus = "Active" | "Expired" | "Revoked";
type PermitInput = {
  business_id: string;
  permit_type: string;
  issue_date: string;
  expiration_date: string;
  fee_amount?: number;
  or_number?: string;
};

interface Props {
  initialPermits: BusinessPermitItem[];
  businesses: BusinessItem[];
  initialError: string;
  onRefresh: (status: string) => Promise<BusinessPermitItem[]>;
  onIssue: (input: PermitInput) => Promise<{ success: boolean; id: string }>;
  onUpdateStatus: (id: string, status: PermitStatus) => Promise<{ success: boolean }>;
}

export function BusinessPermitsClient({ initialPermits, businesses, initialError, onRefresh, onIssue, onUpdateStatus }: Props) {
  const [permits, setPermits] = useState(initialPermits);
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [form, setForm] = useState<PermitInput>({
    business_id: "",
    permit_type: "Barangay Business Clearance",
    issue_date: new Date().toISOString().slice(0, 10),
    expiration_date: `${new Date().getFullYear()}-12-31`,
    fee_amount: 0,
    or_number: "",
  });

  async function refresh(nextFilter = filter) {
    setFilter(nextFilter);
    try {
      setPermits(await onRefresh(nextFilter));
      setError("");
    } catch (err: any) {
      setError(err.message || "Unable to load permits");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onIssue(form);
      setShowModal(false);
      setForm((current) => ({ ...current, business_id: "", or_number: "" }));
      await refresh();
    } catch (err: any) {
      setError(err.message || "Unable to issue permit");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(id: string, status: PermitStatus) {
    setLoading(true);
    setError("");
    try {
      await onUpdateStatus(id, status);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Unable to update permit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Permits</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live permits, renewals, fees, and official receipt references.</p>
        </div>
        <button onClick={() => setShowModal(true)} disabled={businesses.length === 0} className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/95 disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" /> Issue Permit
        </button>
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
      {businesses.length === 0 && !error && <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">No business records are available. A business must be registered before a permit can be issued.</div>}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["All", "Active", "Expired", "Revoked"].map((tab) => <button key={tab} onClick={() => refresh(tab)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>{tab}</button>)}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-6 py-3">Permit No.</th><th className="px-6 py-3">Business</th><th className="px-6 py-3">Permit Type</th><th className="px-6 py-3">Issue / Expiry</th><th className="px-6 py-3">Fee / OR No.</th><th className="px-6 py-3">Status</th></tr>
            </thead>
            <tbody className="divide-y">
              {permits.map((permit) => <tr key={permit.id} className="hover:bg-muted/40">
                <td className="px-6 py-4 font-mono text-xs font-semibold text-primary">{permit.permit_number || permit.id.slice(0, 8)}</td>
                <td className="px-6 py-4 font-medium">{permit.business?.business_name || "Business record"}</td>
                <td className="px-6 py-4 text-muted-foreground">{permit.permit_type || "Barangay Business Clearance"}</td>
                <td className="px-6 py-4 text-xs"><div>{permit.issue_date}</div><div className="text-muted-foreground">until {permit.expiration_date}</div></td>
                <td className="px-6 py-4 text-xs"><div className="font-semibold">₱{Number(permit.fee_amount || 0).toFixed(2)}</div><div className="text-muted-foreground">{permit.or_number || "No OR recorded"}</div></td>
                <td className="px-6 py-4"><select value={permit.status} disabled={loading} onChange={(event) => changeStatus(permit.id, event.target.value as PermitStatus)} className="rounded-full border bg-background px-2.5 py-1 text-xs font-semibold"><option>Active</option><option>Expired</option><option>Revoked</option></select></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {permits.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground"><Briefcase className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />No business permits recorded.</p>}
      </div>

      {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b pb-3"><h2 className="font-bold">Issue Business Permit</h2><button onClick={() => setShowModal(false)} className="rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button></div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-semibold text-muted-foreground">Business<select required value={form.business_id} onChange={(event) => setForm({ ...form, business_id: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"><option value="">Select business</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.business_name}</option>)}</select></label>
          <label className="block text-xs font-semibold text-muted-foreground">Permit type<input required value={form.permit_type} onChange={(event) => setForm({ ...form, permit_type: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-muted-foreground">Issue date<input type="date" required value={form.issue_date} onChange={(event) => setForm({ ...form, issue_date: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label><label className="block text-xs font-semibold text-muted-foreground">Expiration date<input type="date" required value={form.expiration_date} onChange={(event) => setForm({ ...form, expiration_date: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-muted-foreground">Fee<input type="number" min="0" step="0.01" value={form.fee_amount} onChange={(event) => setForm({ ...form, fee_amount: Number(event.target.value) })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label><label className="block text-xs font-semibold text-muted-foreground">OR number<input value={form.or_number} onChange={(event) => setForm({ ...form, or_number: event.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm" /></label></div>
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground">{loading && <Loader2 className="h-4 w-4 animate-spin" />}<Check className="h-4 w-4" />Issue permit</button>
        </form>
      </div></div>}
    </div>
  );
}
