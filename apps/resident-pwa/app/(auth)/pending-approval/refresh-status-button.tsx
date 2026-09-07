"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export function RefreshStatusButton() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  function refreshStatus() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 900);
  }

  return (
    <button
      type="button"
      onClick={refreshStatus}
      disabled={refreshing}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-60"
    >
      {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
      {refreshing ? "Checking status..." : "Refresh approval status"}
    </button>
  );
}
