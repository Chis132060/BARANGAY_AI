import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  const data = body as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (typeof data.endpoint !== "string" || !data.endpoint.startsWith("https://") ||
      data.endpoint.length > 4096 || typeof data.keys?.p256dh !== "string" ||
      typeof data.keys?.auth !== "string" || data.keys.p256dh.length > 512 || data.keys.auth.length > 512) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Only update subscriptions already owned by this user; never reassign an endpoint
  // owned by another resident via an onConflict upsert.
  const { data: existing, error: lookupError } = await supabase.from("push_subscriptions")
    .select("id").eq("user_id", user.id).eq("endpoint", data.endpoint).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Subscription lookup failed" }, { status: 500 });

  const result = existing
    ? await supabase.from("push_subscriptions")
        .update({ p256dh: data.keys.p256dh, auth: data.keys.auth })
        .eq("id", existing.id).eq("user_id", user.id)
    : await supabase.from("push_subscriptions")
        .insert({ user_id: user.id, endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth });
  if (result.error) return NextResponse.json({ error: "Subscription save failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let data: unknown;
  try { data = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const endpoint = (data as { endpoint?: unknown } | null)?.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 4096)
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  const { error } = await supabase.from("push_subscriptions")
    .delete().eq("user_id", user.id).eq("endpoint", endpoint);
  if (error) return NextResponse.json({ error: "Unsubscribe failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
