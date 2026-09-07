"use client";

import { useEffect, useState } from "react";
import { Home, Loader2, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { completeResidentOnboarding } from "@/app/(app)/onboarding/actions";

export function ResidentOnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    householdNumber: "",
    householdSize: "1",
    monthlyIncome: "",
    housingType: "Owned" as "Owned" | "Rented" | "Informal Settler" | "Other",
    relationshipToHead: "Household Head",
    seniorStatus: false,
    pwdStatus: false,
    fourPsStatus: false,
  });

  useEffect(() => {
    let mounted = true;
    async function checkOnboarding() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: resident } = await supabase
          .from("residents")
          .select("verification_status, household_onboarding_completed")
          .eq("user_id", user.id)
          .maybeSingle();
        if (mounted && resident?.verification_status === "Verified" && !resident.household_onboarding_completed) {
          setOpen(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    checkOnboarding();
    return () => { mounted = false; };
  }, []);

  if (loading || !open) return null;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await completeResidentOnboarding({
        ...form,
        householdSize: Math.max(1, Number(form.householdSize) || 1),
        monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : 0,
      });
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "We could not save your household information.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-700"><Home className="h-5 w-5" /></div>
            <div>
              <h2 id="onboarding-title" className="text-base font-extrabold text-gray-900">Complete your resident profile</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">Your account is approved. These details help the Barangay maintain household records and identify eligible programs.</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Complete later" className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-700">Household No. (optional)
              <input value={form.householdNumber} onChange={(e) => setForm({ ...form, householdNumber: e.target.value })} placeholder="Auto-generated" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-xs" />
            </label>
            <label className="text-xs font-semibold text-gray-700">Household size
              <input type="number" min="1" value={form.householdSize} onChange={(e) => setForm({ ...form, householdSize: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-xs" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-700">Monthly income (₱)
              <input type="number" min="0" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} placeholder="Optional" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-xs" />
            </label>
            <label className="text-xs font-semibold text-gray-700">Housing
              <select value={form.housingType} onChange={(e) => setForm({ ...form, housingType: e.target.value as any })} className="mt-1 w-full rounded-xl border bg-white px-3 py-2.5 text-xs">
                <option>Owned</option><option>Rented</option><option>Informal Settler</option><option>Other</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-gray-700">Relationship to household head
            <input value={form.relationshipToHead} onChange={(e) => setForm({ ...form, relationshipToHead: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2.5 text-xs" />
          </label>
          <div className="rounded-2xl border bg-gray-50 p-3">
            <p className="mb-2 text-xs font-bold text-gray-700">Program eligibility (you may update this later)</p>
            {([
              ["seniorStatus", "Senior citizen"],
              ["pwdStatus", "Person with disability (PWD)"],
              ["fourPsStatus", "4Ps beneficiary"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 py-1.5 text-xs text-gray-700">
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[10px] leading-snug text-gray-400"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />Stored under your resident record.</p>
          <button type="button" disabled={saving} onClick={submit} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save profile
          </button>
        </div>
      </div>
    </div>
  );
}
