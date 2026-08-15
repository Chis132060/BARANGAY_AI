import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findMatchingKnowledge } from "@/lib/ai/policy-knowledge";

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

function getLocalFallbackResponse(query: string, isLoggedIn: boolean) {
  const q = query.toLowerCase();

  // Check Cebuano/Bisaya queries
  if (q.includes("unsaon") || q.includes("unsa") || q.includes("maayong") || q.includes("pila") || q.includes("kuha")) {
    if (q.includes("clearance")) {
      return {
        answer: "Ang Barangay Clearance kay nanginahanglan og 1 Valid ID ug Proof of Residency. Ang bayad kay ₱50.00 ug maproseso kini sulod sa 15 hangtod 30 ka minuto. Palihog og Sign In para makasumite og aplikasyon online.",
        citations: ["policy-doc-1"],
        context_used: true,
      };
    } else if (q.includes("indigency")) {
      return {
        answer: "Ang Certificate of Indigency kay libre alang sa mga residente nga nanginahanglan og tulong pinansyal o medikal. Kinahanglan lang og pamatuod sa kita o endorsement.",
        citations: ["policy-doc-2"],
        context_used: true,
      };
    } else if (q.includes("residency")) {
      return {
        answer: "Ang Certificate of Residency kay pamatuod nga ikaw lumulupyo sa barangay. Ang bayad kay ₱30.00 ug kinahanglan og proof of address.",
        citations: ["policy-doc-3"],
        context_used: true,
      };
    } else {
      return {
        answer: "Maayong adlaw! Ako ang imong Smart Barangay AI Assistant. Makatabang ako kanimo bahin sa Barangay Clearance, Certificate of Indigency, Certificate of Residency, ug mga ordinansa sa barangay. Unsa man ang imong kinahanglan?",
        citations: ["policy-doc-general"],
        context_used: true,
      };
    }
  }

  // Check matching knowledge base
  const match = findMatchingKnowledge(query, isLoggedIn);
  if (match) {
    return {
      answer: match.reply,
      citations: ["policy-knowledge-doc"],
      context_used: true,
    };
  }

  // General fallback
  return {
    answer: "Welcome to Smart Barangay AI! You can ask about Barangay Clearance requirements, Certificate of Indigency, office hours, or local community events. Sign in to submit requests online.",
    citations: ["policy-general"],
    context_used: false,
  };
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

    if (fastApiRes.ok) {
      const data = await fastApiRes.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    // API backend is offline — use local knowledge base fallback
    console.warn("[/api/chat] API backend offline, using local policy fallback.");
  }

  const fallback = getLocalFallbackResponse(message, !!user);
  return NextResponse.json(fallback);
}
