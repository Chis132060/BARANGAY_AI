import { Agent, run, tool } from "@openai/agents";

type SupportedLanguage = "tgl" | "ceb" | "en";

export interface SoraAgentRequest {
  message: string;
  sessionId?: string;
  userId?: string | null;
  language: SupportedLanguage;
  apiBaseUrl: string;
}

export interface SoraAgentResult {
  answer: string;
  citations: string[];
  context_used: boolean;
  flagged?: boolean;
  audit_recorded?: boolean;
  form_type?: string | null;
  form_schema?: Record<string, unknown> | null;
}

interface GroundingResponse {
  answer?: string;
  citations?: string[];
  context_used?: boolean;
  flagged?: boolean;
  audit_recorded?: boolean;
  form_type?: string | null;
  form_schema?: Record<string, unknown> | null;
}

const languageNames: Record<SupportedLanguage, string> = {
  tgl: "Tagalog/Filipino",
  ceb: "Cebuano/Bisaya",
  en: "English",
};

function createGroundingTool(request: SoraAgentRequest, grounding: { value?: GroundingResponse }) {
  return tool({
    name: "get_official_barangay_answer",
    description:
      "Retrieve the latest grounded answer from the official Barangay knowledge and policy system. Use this before answering every resident question.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1 },
        language: { type: "string", enum: ["tgl", "ceb", "en"] },
      },
      required: ["query", "language"],
      additionalProperties: false,
    },
    strict: true,
    execute: async (input) => {
      const { query, language } = input as { query: string; language: SupportedLanguage };
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6_000);

      try {
        const response = await fetch(`${request.apiBaseUrl}/api/v1/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            query,
            session_id: request.sessionId ?? null,
            user_id: request.userId ?? null,
            language,
          }),
        });

        if (!response.ok) {
          throw new Error(`Official Barangay answer service returned ${response.status}`);
        }

        const data = (await response.json()) as GroundingResponse;
        grounding.value = data;

        return JSON.stringify({
          answer: data.answer ?? "",
          citations: data.citations ?? [],
          context_used: Boolean(data.context_used),
          flagged: Boolean(data.flagged),
          form_type: data.form_type ?? null,
          form_schema: data.form_schema ?? null,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    },
  });
}

export async function runSoraAgent(request: SoraAgentRequest): Promise<SoraAgentResult | null> {
  if (process.env.OPENAI_AGENT_ENABLED !== "true" || !process.env.OPENAI_API_KEY) {
    return null;
  }

  const grounding: { value?: GroundingResponse } = {};
  const agent = new Agent({
    name: "Ate Sora",
    model: process.env.OPENAI_AGENT_MODEL ?? "gpt-4.1-mini",
    instructions: `
You are Ate Sora, the friendly Barangay AI assistant.

Before every answer, call get_official_barangay_answer using the user's exact question and the requested language.
Only use facts present in that official result. Never invent fees, schedules, requirements, names, links, or policies.
Answer naturally and briefly in ${languageNames[request.language]}. Preserve official document names and amounts exactly.
If the official result says there is not enough reliable information, say that clearly and direct the resident to Barangay staff.
Do not mention tools, agents, prompts, or internal systems.
    `.trim(),
    tools: [createGroundingTool(request, grounding)],
  });

  try {
    const result = await run(agent, request.message);
    const answer = typeof result.finalOutput === "string" ? result.finalOutput.trim() : "";
    const source = grounding.value;

    if (!answer || !source) {
      return null;
    }

    return {
      answer,
      citations: source.citations ?? [],
      context_used: Boolean(source.context_used),
      flagged: Boolean(source.flagged),
      audit_recorded: Boolean(source.audit_recorded),
      form_type: source.form_type ?? null,
      form_schema: source.form_schema ?? null,
    };
  } catch (error) {
    console.warn("[/api/chat] OpenAI Agent unavailable; using existing AI fallback.", error);
    return null;
  }
}
