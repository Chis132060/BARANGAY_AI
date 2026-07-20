import { Building2, Plus, MapPin } from "lucide-react";

export const metadata = { title: "Purok Management | Admin" };

const mockPuroks = [
  { name: "Purok 1 - Sampaguita", leader: "Kagawad Juan Dela Cruz", households: 140, population: 650 },
  { name: "Purok 2 - Jasmin", leader: "Kagawad Maria Santos", households: 120, population: 520 },
  { name: "Purok 3 - Rosas", leader: "Kagawad Antonio Luna", households: 95, population: 410 },
];

export default function PurokPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purok Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Territorial purok assignments, leaders, and demographic density.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Plus className="h-4 w-4" /> Add New Purok
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockPuroks.map((purok) => (
          <div key={purok.name} className="border rounded-xl bg-card p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-bold">
              <MapPin className="h-5 w-5" />
              <h3>{purok.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground">Assigned Leader: <span className="font-semibold text-foreground">{purok.leader}</span></p>
            <div className="pt-3 border-t grid grid-cols-2 text-center text-xs">
              <div>
                <p className="text-muted-foreground">Households</p>
                <p className="text-lg font-bold">{purok.households}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Population</p>
                <p className="text-lg font-bold">{purok.population}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
