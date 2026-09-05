import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findMatchingKnowledge } from "@/lib/ai/policy-knowledge";

// Simple in-memory rate limiter: { key → { count, resetAt } }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_AUTH = 30;   // requests per minute for logged-in users
const RATE_LIMIT_GUEST = 10;  // requests per minute for guests
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

async function writeFallbackAudit(supabase: any, input: {
  userId?: string | null;
  sessionId?: string | null;
  query: string;
  answer: string;
  citations: string[];
  flagged?: boolean;
}) {
  const { error } = await supabase.from("ai_audit_logs").insert({
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    query_text: input.query,
    response_text: input.answer,
    retrieved_chunk_ids: [],
    model_used: "local-policy-fallback",
    latency_ms: 0,
    flagged: input.flagged ?? false,
  });
  return !error;
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await request.json();
  const { message, sessionId, language = "tgl" } = body as {
    message: string;
    sessionId?: string;
    language?: "tgl" | "ceb" | "en";
  };

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

  const match = findMatchingKnowledge(message, !!user, language);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const fastApiRes = await fetch(`${apiBaseUrl}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        query: message,
        session_id: sessionId ?? null,
        user_id: user?.id ?? null,
        language: language,
      }),
    });

    clearTimeout(timeoutId);

    if (fastApiRes.ok) {
      const data = await fastApiRes.json();
      return NextResponse.json({
        ...data,
        formType: match?.formType,
        formTitle: match?.formTitle,
        estimatedFee: match?.estimatedFee,
        guestActionTrigger: match?.guestActionTrigger,
        auditRecorded: data.audit_recorded ?? true,
      });
    }
  } catch (err) {
    console.warn("[/api/chat] API backend offline or timed out, using local policy fallback.");
  }

  // Local knowledge response fallback
  if (match) {
    const answer = match.reply;
    const auditRecorded = await writeFallbackAudit(supabase, {
      userId: user?.id,
      sessionId,
      query: message,
      answer,
      citations: [match.topic.title],
    });
    return NextResponse.json({
      answer,
      citations: [match.topic.title],
      context_used: true,
      formType: match.formType,
      formTitle: match.formTitle,
      estimatedFee: match.estimatedFee,
      guestActionTrigger: match.guestActionTrigger,
      auditRecorded,
    });
  }

  const defaultGreeting: Record<"tgl" | "ceb" | "en", string> = {
    tgl: "Kumusta! Ako ang Smart Barangay AI Assistant. Maaari kitang tulungan tungkol sa Barangay Clearance, Certificate of Indigency, Certificate of Residency, mga ordinansa, at mga aktibidad ng barangay.",
    ceb: "Maayong adlaw! Ako ang Smart Barangay AI Assistant. Makatabang ko bahin sa Barangay Clearance, Certificate of Indigency, Certificate of Residency, mga ordinansa, ug mga kalihokan sa barangay.",
    en: "Hello! I am your Smart Barangay AI Assistant. I can help you with Barangay Clearance, Certificate of Indigency, Certificate of Residency, ordinances, office hours, and community programs.",
  };

  const answer = defaultGreeting[language] || defaultGreeting.en;
  const auditRecorded = await writeFallbackAudit(supabase, {
    userId: user?.id,
    sessionId,
    query: message,
    answer,
    citations: ["Barangay Official Knowledge"],
  });

  return NextResponse.json({
    answer,
    citations: ["Barangay Official Knowledge"],
    context_used: false,
    auditRecorded,
  });
}
