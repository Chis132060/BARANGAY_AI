import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, language } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Text prompt is required." },
        { status: 400 }
      );
    }

    const ttsServiceUrl = process.env.AI_TTS_SERVICE_URL || "http://localhost:8003";

    const response = await fetch(`${ttsServiceUrl}/api/v1/tts/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: language || "tgl" }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `TTS Service returned status ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[TTS API ROUTE ERROR]", error);
    return NextResponse.json(
      { success: false, error: "TTS Service is unavailable." },
      { status: 503 }
    );
  }
}
