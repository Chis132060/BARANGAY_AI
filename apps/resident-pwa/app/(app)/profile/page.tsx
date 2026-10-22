"use client";

import { useEffect, useState } from "react";
import { ChevronRight, LogOut, Bell, Shield, HelpCircle, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ProfilePage() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [userName, setUserName] = useState<string>("Resident");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [fullNameInput, setFullNameInput] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) return;
    setPushSupported(true);
    navigator.serviceWorker.ready.then(async registration => {
      setPushEnabled(Boolean(await registration.pushManager.getSubscription()));
    }).catch(() => {});
  }, []);

  async function togglePush() {
    setBusy(true);
    setFeedback("");
    try {
      if (!pushSupported) throw new Error("Browser push is not supported.");
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) throw new Error("Push is not configured. You can still use the in-app Notification Center.");
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        const response = await fetch("/api/notifications/subscribe", {
          method: "DELETE", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: existing.endpoint }),
        });
        if (!response.ok) throw new Error("Could not remove the subscription.");
        if (!(await existing.unsubscribe())) throw new Error("Browser unsubscribe failed.");
        setPushEnabled(false);
        setFeedback("Push notifications disabled on this device.");
      } else {
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key) throw new Error("Push service is not configured.");
        if (await Notification.requestPermission() !== "granted") throw new Error("Allow notifications in browser settings.");
        const padded = (key + "=".repeat((4 - key.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
        const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
        const response = await fetch("/api/notifications/subscribe", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
        if (!response.ok) {
          await subscription.unsubscribe();
          throw new Error("Could not save subscription.");
        }
        setPushEnabled(true);
        setFeedback("Push notifications enabled on this device.");
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Notification settings failed.");
    } finally { setBusy(false); }
  }

  async function sendPasswordReset() {
    setBusy(true);
    setFeedback("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("Account email unavailable.");
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + "/auth/callback?next=/reset-password",
      });
      if (error) throw error;
      setFeedback("Password reset email requested. Check your inbox.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Password reset failed.");
    } finally { setBusy(false); }
  }
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || "");
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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullNameInput.trim() } });
    if (error) { setFeedback(error.message); return; }
    setUserName(fullNameInput.trim());
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

      {feedback && <p role="status" className="p-3 rounded-xl bg-blue-50 text-blue-800 text-sm">{feedback}</p>}
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

      {/* Menu Options */}
      <section className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50 shadow-sm">
        <button
          onClick={() => { setFeedback(""); setActiveModal("Notifications"); }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Notifications Settings</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </button>

        <button
          onClick={() => { setFeedback(""); setActiveModal("Privacy & Security"); }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-medium text-gray-700">Privacy & Security</span>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-300" />
        </button>

        <button
          onClick={() => { setFeedback(""); setActiveModal("Help & Support"); }}
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
              <div className="space-y-3 text-sm text-gray-700">
                <p>Manage browser push notifications for this device. In-app notifications remain available.</p>
                <Link href="/notifications" onClick={() => setActiveModal(null)} className="block text-center rounded-lg border border-blue-200 p-3 text-blue-700 font-semibold">Open Notification Center</Link>
                <button type="button" onClick={togglePush} disabled={busy || !pushSupported || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
                  aria-pressed={pushEnabled} className="w-full rounded-lg bg-blue-600 text-white px-3 py-2 disabled:opacity-50">
                  {busy ? "Saving..." : pushEnabled ? "Disable push notifications" : "Enable push notifications"}
                </button>
                {!pushSupported && <p className="text-xs text-gray-500">Push is not supported on this browser.</p>}
                {!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && <p className="text-xs text-gray-500">Browser push is not configured. In-app notifications remain available.</p>}
                {feedback && <p role="status" className="text-xs text-blue-700">{feedback}</p>}
              </div>
            )}
            {activeModal === "Privacy & Security" && (
              <div className="space-y-3 text-sm text-gray-700">
                <p>Protect your account. Never share your password or one-time verification codes.</p>
                <p className="text-xs text-gray-500">Account: {userEmail}</p>
                <p className="text-xs text-gray-500">You can request access to your personal information or request account closure. Barangay staff must verify requests and review legal records-retention requirements.</p>
                <Link href="/support?category=Privacy&subject=Request%20a%20copy%20of%20my%20personal%20data" onClick={() => setActiveModal(null)} className="block text-center rounded-lg border border-blue-200 p-3 text-blue-700 font-semibold">Request my personal data</Link>
                <Link href="/support?category=Privacy&subject=Request%20account%20closure" onClick={() => setActiveModal(null)} className="block text-center rounded-lg border border-blue-200 p-3 text-blue-700 font-semibold">Request account closure</Link>
                <button type="button" onClick={sendPasswordReset} disabled={busy}
                  className="w-full rounded-lg border border-blue-200 p-3 text-blue-700 font-semibold disabled:opacity-50">
                  {busy ? "Sending..." : "Send password reset email"}
                </button>
                {feedback && <p role="status" className="text-xs text-blue-700">{feedback}</p>}
              </div>
            )}
            {activeModal === "Help & Support" && (
              <div className="space-y-3 text-sm text-gray-700">
                <p>Need help with your account, verification, or document requests? Contact your Barangay Hall for official assistance.</p>
                <Link href="/support" onClick={() => setActiveModal(null)} className="block text-center rounded-lg bg-blue-600 p-3 text-white font-semibold">Submit or track a support ticket</Link>
                <Link href="/chat" onClick={() => setActiveModal(null)}
                  className="block text-center rounded-lg border border-blue-200 p-3 text-blue-700 font-semibold">
                  Open AI Chat Assistant
                </Link>
                <Link href="/requests" onClick={() => setActiveModal(null)}
                  className="block text-center rounded-lg border border-blue-200 p-3 text-blue-700 font-semibold">
                  View document requests
                </Link>
              </div>
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
