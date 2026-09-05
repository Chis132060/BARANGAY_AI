import { createOfficial, fetchOfficials } from "../actions";
import { fetchResidents } from "../../residents/actions";
import { OfficialsTable } from "./components/OfficialsTable";
import { OfficialCreateForm } from "./components/OfficialCreateForm";

export const metadata = {
  title: "Barangay Officials",
  description: "Governance directory listing current Barangay Officials.",
};

export default async function OfficialsPage() {
  let officials: Awaited<ReturnType<typeof fetchOfficials>> = [];
  let residents: Awaited<ReturnType<typeof fetchResidents>> = [];
  let error = "";

  try {
    [officials, residents] = await Promise.all([fetchOfficials(), fetchResidents()]);
  } catch (err: any) {
    error = err.message || "Unable to load Barangay officials.";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barangay Officials</h1>
          <p className="text-sm text-muted-foreground mt-1">Directory of active officials and active governance terms.</p>
        </div>
        <OfficialCreateForm residents={residents} onCreate={async (input) => { "use server"; return createOfficial(input); }} />
      </div>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}

      <OfficialsTable officials={officials} />
    </div>
  );
}
