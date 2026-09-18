import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
    }

    // Insert or update push subscription securely
    // We use a unique constraint on endpoint in DB to avoid duplicates
    const { error: dbError } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString()
        },
        { onConflict: "endpoint" }
      );

    if (dbError) {
      console.error("Failed to save subscription:", dbError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Subscription endpoint error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
