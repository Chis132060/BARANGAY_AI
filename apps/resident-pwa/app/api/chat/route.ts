import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findMatchingKnowledge } from "@/lib/ai/policy-knowledge";
import { getAIGreeting } from "@/lib/ai/config";

// Fetch published policies from DB matching a query keyword
async function fetchMatchingPolicies(supabase: any, query: string): Promise<{ title: string; content: string }[]> {
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  if (!keywords.length) return [];

  const { data } = await supabase
    .from('barangay_policies')
    .select('title, content')
    .eq('status', 'Published')
    .limit(3);

  if (!data || !data.length) return [];

  // Filter to policies whose title or content contains any query keyword
  return data.filter((p: any) =>
    keywords.some(
      (kw: string) =>
        p.title.toLowerCase().includes(kw) ||
        p.content.toLowerCase().includes(kw)
    )
  );
}

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

  // Dynamic DB policy lookup — check Published barangay_policies for matching content
  const dbPolicies = await fetchMatchingPolicies(supabase, message);
  if (dbPolicies.length > 0) {
    const policyContext = dbPolicies.map(p => `**${p.title}**:\n${p.content}`).join('\n\n');
    const answer = `Based on Barangay Records:\n\n${policyContext}`;
    const citations = dbPolicies.map(p => p.title);
    await writeFallbackAudit(supabase, { userId: user?.id, sessionId, query: message, answer, citations });
    return NextResponse.json({ answer, citations, context_used: true, auditRecorded: true });
  }

  const localFallbackGreetings: Record<string, string> = {
    tgl: `${getAIGreeting('tagalog')}`,
    ceb: `${getAIGreeting('cebuano')}`,
    en: `${getAIGreeting('english')}`,
  };

  const answer = localFallbackGreetings[language] || localFallbackGreetings.en;
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
