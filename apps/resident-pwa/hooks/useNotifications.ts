"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let subscription: any;

    async function setupNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch initial notifications
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.read_status).length);
      }

      // 2. Setup Supabase Realtime for in-app updates
      subscription = supabase
        .channel("public:notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload: any) => {
            setNotifications((prev) => [payload.new, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();
    }

    setupNotifications();
    // Browser notification permission is requested only from explicit user actions.

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [supabase]);

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ read_status: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_status: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return { notifications, unreadCount, markAsRead };
}

