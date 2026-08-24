"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.replace("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors text-sm font-semibold"
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </button>
  );
}
