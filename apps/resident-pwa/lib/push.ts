import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:contact@barangay.ai",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function sendPushNotification(userId: string, title: string, body: string, url: string = "/") {
  const supabase = createClient();

  // 1. Fetch user's push subscriptions
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error || !subscriptions || subscriptions.length === 0) {
    return; // No subscriptions, silent exit
  }

  const payload = JSON.stringify({
    title,
    body,
    url,
  });

  // 2. Send to all subscriptions, handling expirations
  const sendPromises = subscriptions.map(async (sub: any) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (error: any) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        // Subscription has expired or is no longer valid
        console.log("Subscription has expired or is invalid, removing from DB:", sub.endpoint);
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("Push delivery failed:", error);
      }
    }
  });

  await Promise.allSettled(sendPromises);
}
