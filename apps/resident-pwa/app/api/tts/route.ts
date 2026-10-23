import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getApiBaseUrl(): URL | null {
  const configured =
    process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

  // A local fallback is useful only during development. In production, silently
  // falling back to localhost causes requests to fail inside the Vercel runtime.
  const raw =
    configured?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

  if (!raw) return null;

  try {
    // Vercel env vars are sometimes entered as bare hostnames. Normalize those
    // to HTTPS instead of passing an invalid URL to fetch().
    const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(raw)
      ? raw
      : `https://${raw}`;
    const url = new URL(normalized);

    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
      return null;
    }

    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: { session } } = await supabase.auth.getSession();
    if (!user || !session?.access_token) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON request." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }
    const { text, language } = payload as { text?: unknown; language?: unknown };

    if (typeof text !== "string" || !text.trim() || text.length > 1500 || (language !== undefined && language !== "tgl" && language !== "ceb" && language !== "en")) {
      return NextResponse.json(
        { success: false, error: "Provide text of 1–1500 characters and a supported language." },
        { status: 400 }
      );
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      console.error("[TTS] API_BASE_URL/NEXT_PUBLIC_API_BASE_URL is missing or invalid.");
      return NextResponse.json(
        { success: false, error: "Voice service is not configured." },
        { status: 503 }
      );
    }

    const endpoint = new URL(
      `${apiBaseUrl.pathname.replace(/\/+$/, "")}/api/v1/tts/generate`,
      apiBaseUrl.origin
    );
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ text, language: language || "tgl" }),
      signal: AbortSignal.timeout(55000),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({
      success: false,
      error: "Voice service returned an invalid response.",
    }));

    if (!response.ok) {
      console.error("[TTS] Upstream voice service returned HTTP", response.status);
      return NextResponse.json(
        { success: false, error: "Voice service is temporarily unavailable." },
        { status: response.status >= 500 ? 503 : response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[TTS OpenAI ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Voice service is unavailable." },
      { status: 503 }
    );
  }
}
