"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

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
    setupWebPush();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [supabase]);

  async function setupWebPush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        await saveSubscriptionToServer(existingSub);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) return;

        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        const newSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });

        await saveSubscriptionToServer(newSub);
      }
    } catch (err) {
      console.error("Web Push setup failed:", err);
    }
  }

  async function saveSubscriptionToServer(subscription: PushSubscription) {
    try {
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
    } catch (e) {
      console.error("Failed to save push subscription", e);
    }
  }

  async function markAsRead(id: string) {
    await supabase.from("notifications").update({ read_status: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_status: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return { notifications, unreadCount, markAsRead };
}

// Utility to convert Base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
