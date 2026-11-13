import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSoraAgent } from "@/lib/ai/sora-agent";
import { matchServiceFaq, buildServiceFaqAnswer, buildServiceFaqUnavailable } from "@/lib/ai/verified-service-faq";

export const runtime = "nodejs";

// Fetch published policies from DB matching a query keyword
async function fetchMatchingPolicies(supabase: any, query: string): Promise<{ title: string; content: string }[]> {
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  if (!keywords.length) return [];

  // Active rows must also be in their current effective date window.
  // RLS independently restricts residents to Active records.
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('policies')
    .select('policy_number, title, description, full_text')
    .eq('status', 'Active')
    .or(`effective_date.is.null,effective_date.lte.${today}`)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .limit(100);

  if (!data || !data.length) return [];

  // Filter to policies whose title or content contains any query keyword
  return data.filter((p: any) => {
    const content = [p.policy_number, p.title, p.description, p.full_text]
      .filter(Boolean).join("\n").toLowerCase();
    return keywords.some((kw: string) => content.includes(kw));
  }).slice(0, 3).map((p: any) => ({
    title: p.title,
    content: p.full_text || p.description || "No policy text is available.",
  }));
}

// Fail closed for distributed deployments unless a shared limiter is configured.
// No per-instance Map: serverless instances cannot enforce a global quota.
async function checkRateLimit(supabase: any, userId: string | null): Promise<boolean> {
  if (!userId) return false; // Anonymous requests have no reliable shared identity quota.
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
  modelUsed?: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
}) {
  const { error } = await supabase.from("ai_audit_logs").insert({
    user_id: input.userId ?? null,
    session_id: input.sessionId ?? null,
    query_text: input.query,
    response_text: input.answer,
    retrieved_chunk_ids: [],
    model_used: input.modelUsed ?? "local-policy-fallback",
    ...(input.tokensPrompt !== undefined ? { tokens_prompt: input.tokensPrompt } : {}),
    ...(input.tokensCompletion !== undefined ? { tokens_completion: input.tokensCompletion } : {}),
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

  // A reliable anonymous quota requires trusted edge identity and a shared store.
  // Until that is configured, block anonymous AI calls instead of bypassing quotas.
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the AI assistant." }, { status: 401 });
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

  // First check safe, common service-navigation questions against the existing
  // RLS-protected application catalog. This branch must run BEFORE ANY AI agent,
  // external API call, embedding generation, or LLM-based query normalization.
  // Do not accept catalog entries as authority for fees, eligibility, or hours.
  const faq = matchServiceFaq(message);
  if (faq) {
    let catalogVerified = false;
    try {
      const { data, error } = await supabase
        .from("document_types")
        .select("id,name")
        .eq("name", faq.documentName)
        .limit(2);
      catalogVerified = !error && Array.isArray(data) && data.length === 1 &&
        data[0].name === faq.documentName;
    } catch {
      // Fail closed without spending paid-model tokens when the catalog is offline.
      catalogVerified = false;
    }

    const answer = catalogVerified
      ? buildServiceFaqAnswer(faq, language)
      : buildServiceFaqUnavailable(faq, language);
    const citations = catalogVerified ? ["App service catalog: " + faq.documentName] : [];
    const auditRecorded = await writeFallbackAudit(supabase, {
      userId: user.id,
      sessionId,
      query: "SERVICE_FAQ:" + faq.id, // Do not store raw resident text for FAQ analytics.
      answer,
      citations,
      flagged: !catalogVerified,
      modelUsed: "service-catalog-faq/no-llm",
      tokensPrompt: 0,
      tokensCompletion: 0,
    });
    return NextResponse.json({
      answer,
      citations,
      context_used: catalogVerified,
      flagged: !catalogVerified,
      auditRecorded,
      answer_source: catalogVerified ? "app_service_catalog" : "service_catalog_unavailable",
    });
  }

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
      formType: agentResponse.form_type,
      formSchema: agentResponse.form_schema,
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
        formType: data.form_type,
        auditRecorded: data.audit_recorded === true,
      });
    }
  } catch (err) {
    console.warn("[/api/chat] API backend offline or timed out; checking current active DB policies.");
  }

  // Do not answer from hard-coded policy facts, fees, office hours, or events.
  // These local constants have no publication status or expiry guarantee.

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

  // If no approved, current record is available, return uncertainty instead of
  // inventing an official answer or attaching a misleading official citation.
  const unavailable: Record<string, string> = {
    tgl: "Hindi ko pa ma-verify ang opisyal at kasalukuyang impormasyon. Pakikumpirma muna sa tanggapan ng barangay.",
    ceb: "Dili pa nako ma-verify ang opisyal ug kasamtangang impormasyon. Palihug kumpirmaha una sa opisina sa barangay.",
    en: "I cannot verify current official information right now. Please confirm with the barangay office.",
  };
  const answer = unavailable[language] || unavailable.en;
  const auditRecorded = await writeFallbackAudit(supabase, {
    userId: user?.id,
    sessionId,
    query: message,
    answer,
    citations: [],
    flagged: true,
  });

  return NextResponse.json({
    answer,
    citations: [],
    context_used: false,
    auditRecorded,
  });
}
