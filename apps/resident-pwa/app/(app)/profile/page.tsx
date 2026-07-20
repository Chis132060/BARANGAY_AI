"use client";

import { useEffect, useState } from "react";
import { User, ChevronRight, LogOut, Bell, Shield, HelpCircle, X, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState<string>("resident@barangay.gov");
  const [userName, setUserName] = useState<string>("Resident");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [fullNameInput, setFullNameInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || "resident@barangay.gov");
          const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Resident";
          setUserName(name);
          setFullNameInput(name);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setUserName(fullNameInput);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  }

  return (
    <div className="p-4 space-y-6 pb-20">
      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600" />
          Profile information updated successfully!
        </div>
      )}

      {/* Avatar + Name */}
      <section className="flex flex-col items-center py-6 bg-gradient-to-b from-blue-50/50 to-transparent rounded-2xl border border-blue-50">
        <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center mb-3 shadow-md text-white font-bold text-2xl uppercase">
          {userName.charAt(0)}
        </div>
        <h1 className="text-lg font-bold text-gray-900">{loading ? "Loading..." : userName}</h1>
        <p className="text-sm text-gray-500">{userEmail}</p>
        <button
          onClick={() => setIsEditing(true)}
          className="mt-3 px-4 py-1.5 rounded-full border border-blue-600 text-blue-600
                     text-sm font-medium hover:bg-blue-50 transition-colors"
        >
          Edit Profile
        </button>
      </section>

      {/* Household Info */}
      <section className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">
          Household Information
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Address</span>
            <span className="font-medium text-gray-800">Zone 4, Main Street</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Purok</span>
            <span className="font-medium text-gray-800">Purok 2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Verification</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Verified Resident
            </span>
          </div>
        </div>
      </section>

      {/* Menu Options */}
      <section className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
        <button
          onClick={() => setActiveModal("Notifications")}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Notifications Settings</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </button>

        <button
          onClick={() => setActiveModal("Privacy & Security")}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Privacy & Security</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </button>

        <button
          onClick={() => setActiveModal("Help & Support")}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">Help & Support</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </button>
      </section>

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                   border border-red-200 text-red-600 hover:bg-red-50 transition-colors
                   text-sm font-semibold shadow-sm"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-gray-900">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Email (Read Only)</label>
                <input
                  type="text"
                  value={userEmail}
                  disabled
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Information Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-gray-900">{activeModal}</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {activeModal === "Notifications" && (
              <p className="text-xs text-gray-600 leading-relaxed">
                Push notifications for Barangay announcements and document request status updates are currently enabled for this device.
              </p>
            )}
            {activeModal === "Privacy & Security" && (
              <p className="text-xs text-gray-600 leading-relaxed">
                Your personal details are encrypted and securely stored. Only authorized Barangay officials have access to resident records.
              </p>
            )}
            {activeModal === "Help & Support" && (
              <p className="text-xs text-gray-600 leading-relaxed">
                Need help? Contact the Barangay Hall hotline at (02) 8123-4567 or chat with our 24/7 AI Assistant in the AI Chat tab.
              </p>
            )}
            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
