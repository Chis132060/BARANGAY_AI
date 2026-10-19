"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Home, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { completeResidentOnboarding } from "@/app/(app)/onboarding/actions";

export function ResidentOnboardingDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const savingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeProfile = () => {
    if (savingRef.current) return;
    setError(null);
    setOpen(false);
  };

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const housingValue = String(formData.get("housingType") || "Owned");
    const housingType = ["Owned", "Rented", "Informal Settler", "Other"].includes(housingValue)
      ? housingValue as "Owned" | "Rented" | "Informal Settler" | "Other"
      : "Owned";

    try {
      await completeResidentOnboarding({
        householdNumber: String(formData.get("householdNumber") || ""),
        householdSize: Math.max(1, Number(formData.get("householdSize")) || 1),
        monthlyIncome: Math.max(0, Number(formData.get("monthlyIncome")) || 0),
        housingType,
        relationshipToHead: String(formData.get("relationshipToHead") || "Household Head"),
        seniorStatus: formData.has("seniorStatus"),
        pwdStatus: formData.has("pwdStatus"),
        fourPsStatus: formData.has("fourPsStatus"),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save your household information.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;
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
        if (active && resident?.verification_status === "Verified" && !resident.household_onboarding_completed) {
          setOpen(true);
        }
      } catch (err) {
        console.error("Unable to check resident onboarding:", err);
        if (active) setError("Unable to check your resident profile. Please refresh the page.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void checkOnboarding();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  if (!mounted || loading || !open) return null;

  return createPortal(
    <div
      aria-labelledby="onboarding-title"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex h-[100dvh] items-center justify-center overflow-hidden bg-slate-950/50 p-4 text-left backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget) closeProfile(); }}
    >
      <div className="pointer-events-none flex h-full w-full items-center justify-center overflow-y-auto overscroll-contain touch-pan-y">
        <section className="pointer-events-auto relative z-[101] my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white p-5 pb-safe shadow-2xl touch-pan-y" onClick={(event) => event.stopPropagation()}>
          <header className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700"><Home className="h-5 w-5" /></div>
              <div>
                <h2 id="onboarding-title" className="text-base font-extrabold text-gray-900">Complete your resident profile</h2>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">Your account is approved. These details help the Barangay maintain household records and identify eligible programs.</p>
              </div>
            </div>
            <button type="button" onClick={closeProfile} disabled={saving} aria-label="Complete later" className="relative z-10 flex min-h-10 min-w-10 touch-manipulation items-center justify-center rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </header>

          <form onSubmit={submitProfile} className="mt-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-700">Household No. (optional)
                  <input name="householdNumber" placeholder="Auto-generated" className="mt-1 min-h-12 w-full touch-manipulation rounded-xl border border-gray-200 px-3 py-2.5 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm" />
                </label>
                <label className="text-xs font-semibold text-gray-700">Household size
                  <input name="householdSize" type="number" min="1" defaultValue="1" required className="mt-1 min-h-12 w-full touch-manipulation rounded-xl border border-gray-200 px-3 py-2.5 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-gray-700">Monthly income (₱)
                  <input name="monthlyIncome" type="number" min="0" placeholder="Optional" className="mt-1 min-h-12 w-full touch-manipulation rounded-xl border border-gray-200 px-3 py-2.5 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm" />
                </label>
                <label className="text-xs font-semibold text-gray-700">Housing
                  <select name="housingType" defaultValue="Owned" className="mt-1 min-h-12 w-full touch-manipulation rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm">
                    <option>Owned</option><option>Rented</option><option>Informal Settler</option><option>Other</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-gray-700">Relationship to household head
                <input name="relationshipToHead" defaultValue="Household Head" className="mt-1 min-h-12 w-full touch-manipulation rounded-xl border border-gray-200 px-3 py-2.5 text-base text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm" />
              </label>
              <fieldset className="rounded-2xl border bg-gray-50 p-3">
                <legend className="mb-2 text-xs font-bold text-gray-700">Program eligibility (you may update this later)</legend>
                {[["seniorStatus", "Senior citizen"], ["pwdStatus", "Person with disability (PWD)"], ["fourPsStatus", "4Ps beneficiary"]].map(([name, label]) => (
                  <label key={name} className="flex min-h-10 items-center gap-2 py-1.5 text-xs text-gray-700">
                    <input name={name} type="checkbox" className="h-5 w-5 touch-manipulation rounded border-gray-300 text-blue-600" />
                    {label}
                  </label>
                ))}
              </fieldset>
            </div>

            {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <footer className="mt-4 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[10px] leading-snug text-gray-400"><ShieldCheck className="h-3.5 w-3.5 shrink-0" />Stored under your resident record.</p>
              <div className="flex items-center gap-2">
              <button type="button" onClick={closeProfile} disabled={saving} className="relative z-10 flex min-h-12 touch-manipulation items-center rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="relative z-10 flex min-h-12 touch-manipulation items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70">
                {saving ? "Saving…" : "Save profile"}
              </button>
              </div>
            </footer>
          </form>
        </section>
      </div>
    </div>,
    document.body
  );
}
