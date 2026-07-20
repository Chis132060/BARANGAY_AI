import { Settings, Save, Building } from "lucide-react";

export const metadata = { title: "System Settings | Admin" };

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">General barangay portal configuration and system options.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow hover:bg-primary/95">
          <Save className="h-4 w-4" /> Save Settings
        </button>
      </div>

      <div className="space-y-6">
        {/* Barangay Profile Settings */}
        <div className="border rounded-xl bg-card p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" /> Barangay Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Barangay Name</label>
              <input type="text" defaultValue="Barangay Smart AI" className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Municipality / City</label>
              <input type="text" defaultValue="Central City" className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Province</label>
              <input type="text" defaultValue="Metro Province" className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Contact Number</label>
              <input type="text" defaultValue="(02) 8123-4567" className="w-full border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>
        </div>

        {/* AI Assistant Settings */}
        <div className="border rounded-xl bg-card p-6 space-y-4 shadow-sm">
          <h2 className="text-lg font-bold">AI Assistant Configuration</h2>
          <p className="text-xs text-muted-foreground">Configure automatic resident chat responses and knowledge base sync.</p>
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <p className="text-sm font-semibold">Enable 24/7 Resident AI Chatbot</p>
              <p className="text-xs text-muted-foreground">Allows residents to inquire about requirements and announcements automatically.</p>
            </div>
            <input type="checkbox" defaultChecked className="h-5 w-5 accent-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
