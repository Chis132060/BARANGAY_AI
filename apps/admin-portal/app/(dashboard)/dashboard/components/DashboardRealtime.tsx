"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DashboardRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Listen for changes on critical tables affecting dashboard metrics
    const channel = supabase
      .channel('admin-dashboard-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, () => {
        router.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'residents' }, () => {
        router.refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
