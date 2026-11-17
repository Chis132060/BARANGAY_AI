import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runSoraAgent } from "@/lib/ai/sora-agent";
import { matchServiceFaq, buildServiceFaqAnswer, buildServiceFaqUnavailable } from "@/lib/ai/verified-service-faq";
import { isPolicyQuestion, getVerifiedPolicyAnswer, isServiceInformationQuestion, getVerifiedServiceAnswer } from "@/lib/ai/verified-policy-grounding";
import { getVerifiedResidentConcernAnswer, getOfflineConversationReply, isWelfareSupportQuestion } from "@/lib/ai/resident-concern-grounding";
import { getResidentChatMemory, isChatMemoryQuestion, buildSavedConversationRecall } from "@/lib/ai/sora-chat-memory";

export const runtime = "nodejs";

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

  // Read ONLY this authenticated resident's own messages. Past-chat context
  // is opt-in by database preference (never trusted from the request body).
  // A bounded history supports explicit recall, not fake persistent facts or
  // memory of every message ever written.
  const residentMemory = await getResidentChatMemory(supabase, user.id, sessionId);
  if (isChatMemoryQuestion(message)) {
    const answer = buildSavedConversationRecall(residentMemory, language, message);
    const auditRecorded = await writeFallbackAudit(supabase, {
      userId: user.id, sessionId,
      query: "RESIDENT_CHAT_MEMORY_RECALL", // don't copy private text into audit query
      answer, citations: [],
      flagged: false, modelUsed: "resident-chat-history/no-llm",
      tokensPrompt: 0, tokensCompletion: 0,
    });
    return NextResponse.json({
      answer, citations: [], context_used: residentMemory.turns.length > 0,
      auditRecorded, answer_source: "resident_chat_history",
      model_used: "resident-chat-history/no-llm",
      tokens_prompt: 0, tokens_completion: 0,
    });
  }

  // Urgent hunger and financial crises must be answered before general service
  // FAQs or legal-policy matching. Residents may mention "Certificate of
  // Indigency" in a hunger request: do not mistake it for an ordinary form FAQ.
  // The sources, requirements, offices and eligibility remain from the
  // staff-reviewed, RLS-scoped government program and CSWDD database records.
  if (isWelfareSupportQuestion(message)) {
    try {
      const assistance = await getVerifiedResidentConcernAnswer(supabase, message, language);
      if (assistance) {
        const auditRecorded = await writeFallbackAudit(supabase, {
          userId: user.id, sessionId,
          query: "VERIFIED_WELFARE_GUIDANCE", // Do not store private financial-crisis description.
          answer: assistance.answer, citations: assistance.citations,
          flagged: false, modelUsed: "verified-welfare-reference/no-llm",
          tokensPrompt: 0, tokensCompletion: 0,
        });
        return NextResponse.json({
          ...assistance, auditRecorded,
          answer_source: "published_social_welfare_guidance",
          model_used: "verified-welfare-reference/no-llm",
          tokens_prompt: 0, tokens_completion: 0,
        });
      }
    } catch {
      console.warn("Approved welfare catalog unavailable; falling back to normal chat routing.");
    }
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

    // Read details from the live service catalog. The static FAQ gives
    // navigation guidance only, never requirements, fees or eligibility.
    const serviceDetails = catalogVerified
      ? await getVerifiedServiceAnswer(supabase, faq.documentName, language) : null;
    const answer = catalogVerified
      ? [serviceDetails?.answer, buildServiceFaqAnswer(faq, language)].filter(Boolean).join("\n\n")
      : buildServiceFaqUnavailable(faq, language);
    const citations = catalogVerified
      ? (serviceDetails?.citations ?? ["App service catalog: " + faq.documentName]) : [];
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
      model_used: "service-catalog-faq/no-llm",
      tokens_prompt: 0,
      tokens_completion: 0,
    });
  }

  // Answer residents about laws and neighborhood problems from LIVE, approved
  // barangay policies, Butuan City code references and Philippine government
  // legal sources. Unverified draft PDFs are never legal authority.
  // Keep this before all models so an LLM cannot fill in missing rules.
  if (isPolicyQuestion(message)) {
    const grounded = await getVerifiedPolicyAnswer(supabase, message, language);
    const auditRecorded = await writeFallbackAudit(supabase, {
      userId: user.id, sessionId, query: "POLICY_QUERY:" + message,
      answer: grounded.answer, citations: grounded.citations,
      flagged: grounded.flagged, modelUsed: "verified-policy-registry/no-llm",
      tokensPrompt: 0, tokensCompletion: 0,
    });
    return NextResponse.json({
      ...grounded,
      auditRecorded,
      answer_source: grounded.context_used ? "verified_legal_and_service_registry" : "policy_not_verified",
      model_used: "verified-policy-registry/no-llm",
      tokens_prompt: 0,
      tokens_completion: 0,
    });
  }

  // All published document-service entries, including services beyond the four
  // shortcuts, must come from the actual database rather than hardcoded names.
  if (isServiceInformationQuestion(message)) {
    const grounded = await getVerifiedServiceAnswer(supabase, message, language);
    if (grounded) {
      const auditRecorded = await writeFallbackAudit(supabase, {
        userId: user.id, sessionId, query: "SERVICE_INFO:" + message,
        answer: grounded.answer, citations: grounded.citations,
        flagged: grounded.flagged, modelUsed: "live-document-catalog/no-llm",
        tokensPrompt: 0, tokensCompletion: 0,
      });
      return NextResponse.json({
        ...grounded, auditRecorded,
        answer_source: "live_document_catalog",
        model_used: "live-document-catalog/no-llm",
        tokens_prompt: 0, tokens_completion: 0,
      });
    }
  }

  // Understand ordinary descriptions ("ninakawan ako", "may problema sa..."),
  // not only messages containing the words "policy" or "batas". The category,
  // next steps and citation come from published staff-reviewed database rows.
  // Unknown concerns continue through the normal AI backend rather than
  // being mapped to a random or unverified legal reference.
  try {
    const concern = await getVerifiedResidentConcernAnswer(supabase, message, language);
    if (concern) {
      const auditRecorded = await writeFallbackAudit(supabase, {
        userId: user.id, sessionId,
        query: "VERIFIED_RESIDENT_CONCERN", // avoid storing sensitive incident descriptions
        answer: concern.answer, citations: concern.citations,
        flagged: false, modelUsed: "verified-incident-guide/no-llm",
        tokensPrompt: 0, tokensCompletion: 0,
      });
      return NextResponse.json({
        ...concern, auditRecorded,
        answer_source: "published_incident_guide",
        model_used: "verified-incident-guide/no-llm",
        tokens_prompt: 0, tokens_completion: 0,
      });
    }
  } catch (err) {
    console.warn("Published incident lookup unavailable; continuing to authenticated AI backend.");
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const agentResponse = await runSoraAgent({
    message,
    sessionId,
    userId: user?.id,
    language,
    apiBaseUrl,
    accessToken: session?.access_token,
    conversationContext: residentMemory.context,
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

  // Even during a backend outage, keep the conversation useful and honest.
  // Do not repeat a dead-end "cannot verify" message or invent local laws.
  const answer = getOfflineConversationReply(message, language);
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
