import { NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-pro-preview-tts";
const GEMINI_TTS_VOICE = process.env.GEMINI_TTS_VOICE || "Umbriel";

function pcmToWavDataUrl(base64Pcm: string, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const pcm = Buffer.from(base64Pcm, "base64");
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return `data:audio/wav;base64,${Buffer.concat([header, pcm]).toString("base64")}`;
}

async function generateWithGemini(text: string, language?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const languageName = language === "ceb" ? "Cebuano" : language === "en" ? "English" : "Filipino";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TTS_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Read this ${languageName} script exactly as written in a warm, natural, friendly female voice. Do not add commentary or extra words.\n\n${text}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: GEMINI_TTS_VOICE,
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    console.warn(`[TTS] Gemini returned status ${response.status}; trying fallback.`);
    return null;
  }

  const data = await response.json();
  const part = data?.candidates?.[0]?.content?.parts?.find(
    (candidate: { inlineData?: { data?: string }; inline_data?: { data?: string } }) =>
      candidate.inlineData?.data || candidate.inline_data?.data
  );
  const audioBase64 = part?.inlineData?.data || part?.inline_data?.data;

  if (!audioBase64) {
    console.warn("[TTS] Gemini returned no audio data; trying fallback.");
    return null;
  }

  return {
    success: true,
    data: {
      audio_url: pcmToWavDataUrl(audioBase64),
      format: "wav",
      sample_rate: 24000,
      source: "gemini",
      voice: GEMINI_TTS_VOICE,
    },
  };
}

async function generateWithLocalTts(text: string, language?: string) {
  const ttsServiceUrl = process.env.AI_TTS_SERVICE_URL || "http://localhost:8003";
  const response = await fetch(`${ttsServiceUrl}/api/v1/tts/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language: language || "tgl" }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`TTS Service returned status ${response.status}`);
  }

  return response.json();
}

export async function POST(req: Request) {
  try {
    const { text, language } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Text prompt is required." },
        { status: 400 }
      );
    }

    try {
      const geminiAudio = await generateWithGemini(text, language);
      if (geminiAudio) return NextResponse.json(geminiAudio);
    } catch (error) {
      console.warn("[TTS] Gemini request failed; trying local TTS fallback.", error);
    }

    try {
      const localAudio = await generateWithLocalTts(text, language);
      return NextResponse.json(localAudio);
    } catch (error) {
      console.warn("[TTS] Local TTS unavailable; browser speech fallback will be used.", error);
    }

    return NextResponse.json(
      { success: false, error: "TTS providers are unavailable." },
      { status: 503 }
    );
  } catch (error) {
    console.error("[TTS API ROUTE ERROR]", error);
    return NextResponse.json(
      { success: false, error: "TTS service is unavailable." },
      { status: 503 }
    );
  }
}
