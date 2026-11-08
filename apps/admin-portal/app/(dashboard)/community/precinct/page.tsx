import { createPrecinct, deletePrecinct, fetchPrecincts, updatePrecinct } from "../actions";
import { PrecinctCreateForm } from "./PrecinctCreateForm";
import { PrecinctTable } from "./PrecinctTable";

export const metadata = { title: "Precinct Management | Admin" };

export default async function PrecinctPage() {
  let precincts: Awaited<ReturnType<typeof fetchPrecincts>> = [];
  let error = "";
  try { precincts = await fetchPrecincts(); } catch (err: any) { error = err.message || "Unable to load precinct records."; }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Precinct Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live electoral precinct and polling location records.</p>
        </div>
        <PrecinctCreateForm onCreate={async (number, location) => { "use server"; return createPrecinct(number, location); }} />
      </div>
      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>}
      {precincts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">No precinct records have been configured yet.</div>
      ) : (
        <PrecinctTable
          precincts={precincts}
          onUpdate={async (id, number, location) => { "use server"; return updatePrecinct(id, number, location); }}
          onDelete={async (id) => { "use server"; return deletePrecinct(id); }}
        />
      )}
    </div>
  );
}
