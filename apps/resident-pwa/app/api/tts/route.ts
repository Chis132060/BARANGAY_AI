import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text, language } = await req.json();

    if (typeof text !== "string" || !text.trim() || text.length > 1500 || !["tgl", "ceb", "en", undefined].includes(language)) {
      return NextResponse.json(
        { success: false, error: "Provide text of 1–1500 characters and a supported language." },
        { status: 400 }
      );
    }

    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/v1/tts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: language || "tgl" }),
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({
      success: false,
      error: "Gemini TTS returned an invalid response.",
    }));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: "Voice service is temporarily unavailable." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[TTS Gemini Umbriel ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Gemini Umbriel voice is unavailable." },
      { status: 503 }
    );
  }
}
