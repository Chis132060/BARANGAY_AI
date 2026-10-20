"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHousehold } from "./actions";

export function CreateHouseholdForm() {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [housingType, setHousingType] = useState("");
  const [income, setIncome] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return <form className="rounded-xl border bg-card p-4 space-y-3" onSubmit={(event) => {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createHousehold({ household_number: number, housing_type: housingType, monthly_income: income ? Number(income) : undefined });
        setNumber(""); setHousingType(""); setIncome(""); router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Could not create household"); }
    });
  }}>
    <h2 className="text-sm font-bold">Add household</h2>
    <div className="grid gap-3 md:grid-cols-3">
      <label className="text-xs font-semibold">Household number<input required maxLength={80} value={number} onChange={e => setNumber(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="text-xs font-semibold">Housing type<input value={housingType} onChange={e => setHousingType(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
      <label className="text-xs font-semibold">Monthly income (PHP)<input type="number" min="0" step="0.01" value={income} onChange={e => setIncome(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm" /></label>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="submit" disabled={pending} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{pending ? "Saving..." : "Create household"}</button>
  </form>;
}
