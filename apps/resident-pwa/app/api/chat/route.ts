import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findMatchingKnowledge } from "@/lib/ai/policy-knowledge";
import { getAIGreeting } from "@/lib/ai/config";
import { runSoraAgent } from "@/lib/ai/sora-agent";

export const runtime = "nodejs";

// Fetch published policies from DB matching a query keyword
async function fetchMatchingPolicies(supabase: any, query: string): Promise<{ title: string; content: string }[]> {
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  if (!keywords.length) return [];

  const { data } = await supabase
    .from('barangay_policies')
    .select('title, content')
    .eq('status', 'Published')
    .limit(100);

  if (!data || !data.length) return [];

  // Filter to policies whose title or content contains any query keyword
  return data.filter((p: any) =>
    keywords.some((kw: string) =>
      p.title.toLowerCase().includes(kw) || p.content.toLowerCase().includes(kw)
    )
  ).slice(0, 3);
}

// Fail closed for distributed deployments unless a shared limiter is configured.
// No per-instance Map: serverless instances cannot enforce a global quota.
async function checkRateLimit(supabase: any, userId: string | null): Promise<boolean> {
  if (!userId) return true; // Guest messages are limited to public knowledge without user-specific tools.
  const { data, error } = await supabase.rpc("consume_chat_rate_limit", {
    p_limit: 30,
    p_window_seconds: 60,
  });
  if (error) {
    console.error("Chat rate limiter unavailable:", error.message);
    return false;
  }
  return data === true;
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
  const { data: { session } } = await supabase.auth.getSession();
  const authorization = session?.access_token ? `Bearer ${session.access_token}` : undefined;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { message, sessionId, language = "tgl" } = body as {
    message: string;
    sessionId?: string;
    language?: "tgl" | "ceb" | "en";
  };

  if (typeof message !== "string" || !message.trim() || message.length > 4000 || !["tgl", "ceb", "en"].includes(language)) {
    return NextResponse.json({ error: "Provide a message of 1–4000 characters and a supported language." }, { status: 400 });
  }

  // Rate limiting
  // Forwarded IP headers are client-controllable unless normalized by trusted infrastructure.
  // Do not treat them as authenticated identities for quota decisions.
  if (!(await checkRateLimit(supabase, user?.id ?? null))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  const match = findMatchingKnowledge(message, !!user, language);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const agentResponse = await runSoraAgent({
    message,
    sessionId,
    userId: user?.id,
    language,
    apiBaseUrl,
    accessToken: session?.access_token,
  });

  if (agentResponse) {
    return NextResponse.json({
      ...agentResponse,
      formType: match?.formType ?? agentResponse.form_type,
      formSchema: agentResponse.form_schema,
      formTitle: match?.formTitle,
      estimatedFee: match?.estimatedFee,
      guestActionTrigger: match?.guestActionTrigger,
      auditRecorded: agentResponse.audit_recorded === true,
    });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const fastApiRes = await fetch(`${apiBaseUrl}/api/v1/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) },
      signal: controller.signal,
      body: JSON.stringify({
        query: message,
        session_id: sessionId ?? null,
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
        auditRecorded: data.audit_recorded === true,
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
    const auditRecorded = await writeFallbackAudit(supabase, {
      userId: user?.id, sessionId, query: message, answer, citations,
    });
    return NextResponse.json({ answer, citations, context_used: true, auditRecorded });
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
