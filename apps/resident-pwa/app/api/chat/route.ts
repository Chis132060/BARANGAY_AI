import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Simple in-memory rate limiter: { key → { count, resetAt } }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_AUTH = 20;   // requests per minute for logged-in users
const RATE_LIMIT_GUEST = 5;   // requests per minute for guests
const WINDOW_MS = 60_000;

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true; // allowed
  }
  if (entry.count >= limit) return false; // blocked
  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await request.json();
  const { message, sessionId } = body as { message: string; sessionId?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Rate limiting
  const rateLimitKey = user?.id ?? (request.headers.get("x-forwarded-for") ?? "guest");
  const limit = user ? RATE_LIMIT_AUTH : RATE_LIMIT_GUEST;

  if (!checkRateLimit(rateLimitKey, limit)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const fastApiRes = await fetch(`${apiBaseUrl}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: message,
        session_id: sessionId ?? null,
        user_id: user?.id ?? null,
      }),
    });

    if (!fastApiRes.ok) {
      const errText = await fastApiRes.text();
      console.error("[/api/chat] FastAPI error:", errText);
      return NextResponse.json(
        { error: "AI service unavailable. Please try again shortly." },
        { status: 502 }
      );
    }

    const data = await fastApiRes.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/chat] Network error:", err);
    return NextResponse.json(
      { error: "Could not reach AI service. Please check your connection." },
      { status: 503 }
    );
  }
}
