/**
 * Ate Sora resident memory: short, bounded context from chat history that the
 * same authenticated resident owns. Cross-chat recall is opt-in, default OFF.
 * Chat history itself stays available whether or not memory is enabled.
 */
export type ChatLanguage = "tgl" | "ceb" | "en";

type StoredTurn = {
  id: string;
  sender: "user" | "ai";
  message: string;
  created_at: string | null;
  session_id: string | null;
};

type MemoryRead = {
  turns: StoredTurn[];
  remembersOtherChats: boolean;
  context: string;
};

export function isChatMemoryQuestion(message: string): boolean {
  return /\b(?:naalala|naaalala|natatandaan|nabanggit|pinag-?usapan|usap natin|sabi ko dati|sinabi ko dati|dati kong sinabi|last time|previous chat|previous conversation|earlier chat|remember|recall|what did i (?:say|ask)|what we talked about|our old chats)\b/i.test(message);
}

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function safeTurn(row: unknown): row is StoredTurn {
  if (!row || typeof row !== "object") return false;
  const r = row as Partial<StoredTurn>;
  return (r.sender === "user" || r.sender === "ai") && typeof r.message === "string" &&
    r.message.length > 0 && typeof r.id === "string";
}

export async function getResidentChatMemory(
  db: any, userId: string, sessionToken: string | undefined
): Promise<MemoryRead> {
  const empty: MemoryRead = { turns: [], remembersOtherChats: false, context: "" };
  if (!isUuid(userId) || !sessionToken || !isUuid(sessionToken)) return empty;

  // This is a normal authenticated Supabase client, never a service-role one.
  // RLS and explicit user_id predicates must BOTH restrict ownership.
  const [sessionResult, preferences] = await Promise.all([
    db.from("chat_sessions").select("id,user_id").eq("user_id", userId)
      .eq("session_token", sessionToken).maybeSingle(),
    db.from("sora_chat_memory_preferences").select("remember_previous_chats")
      .eq("user_id", userId).maybeSingle(),
  ]);
  if (sessionResult.error || preferences.error) return empty;

  const currentId = sessionResult.data?.id;
  const remember = preferences.data?.remember_previous_chats === true;
  // Previous conversations are not read automatically unless explicitly
  // enabled by the resident; the active chat is always available.
  const recent = currentId
    ? db.from("chat_messages")
        .select("id,sender,message,created_at,session_id")
        .eq("user_id", userId).eq("session_id", currentId)
        .order("created_at", { ascending: false }).limit(14)
    : Promise.resolve({ data: [], error: null });

  const past = remember
    ? db.from("chat_messages")
        .select("id,sender,message,created_at,session_id")
        .eq("user_id", userId)
        .neq("session_id", currentId ?? "00000000-0000-0000-0000-000000000000")
        .order("created_at", { ascending: false }).limit(16)
    : Promise.resolve({ data: [], error: null });

  const [recentResult, pastResult] = await Promise.all([recent, past]);
  const recentRows = recentResult.error ? [] : (recentResult.data ?? []).filter(safeTurn);
  const olderRows = pastResult.error ? [] : (pastResult.data ?? []).filter(safeTurn);
  const combined = [...olderRows.reverse(), ...recentRows.reverse()].slice(-28);
  const context = combined.map(row => {
    const text = row.message.trim().replace(/\s+/g, " ").slice(0, 360);
    return (row.sender === "user" ? "Resident" : "Ate Sora") + ": " + text;
  }).join("\n").slice(-6900);

  return { turns: combined, remembersOtherChats: remember, context };
}

export function buildSavedConversationRecall(
  memory: MemoryRead, language: ChatLanguage
): string {
  const userTurns = memory.turns.filter(turn => turn.sender === "user").slice(-5);
  if (!userTurns.length) {
    return language === "en"
      ? "I couldn't find previous saved messages to quote. You can open Chat History to view older conversations. Enable 'Remember previous chats' if you'd like me to use past conversations when answering."
      : language === "ceb"
        ? "Wala pa koy nakita nga na-save nga mensahe. Ablihi ang Chat History aron makita ang daang mga pag-istorya. I-enable ang 'Remember previous chats' aron magamit nako ang nangaging mga chat."
        : "Wala pa akong makitang naka-save na naunang mensahe sa chat na ito. Buksan ang Chat History para balikan ang mga usapan. Kung gusto mong maalala ko rin ang ibang chat, i-on ang 'Remember previous chats'.";
  }
  const intro = language === "en"
    ? "Here are some of your recent saved questions. I can quote these, but some older or unsaved messages may be missing:"
    : language === "ceb"
      ? "Mao ni ang pipila sa imong mga na-save nga nangaging pangutana. Posibleng dili kompleto ang mga karaang chat:"
      : "Oo, may naka-save tayong mga usapan. Ito ang ilan sa mga huling tanong mo (posibleng may lumang chat na hindi pa nai-save):";
  const outro = memory.remembersOtherChats
    ? language === "en" ? "Previous-chat memory is on. Which topic would you like to continue?"
      : language === "ceb" ? "Aktibo ang previous-chat memory. Unsa atong ipadayon?"
        : "Naka-on ang memory para sa previous chats. Alin dito ang gusto mong ituloy?"
    : language === "en" ? "For earlier sessions, turn on 'Remember previous chats' in Chat History."
      : language === "ceb" ? "Para sa ubang sessions, i-on ang 'Remember previous chats' sa Chat History."
        : "Para maalala ko rin ang ibang session, i-on ang 'Remember previous chats' sa Chat History.";
  return intro + "\n\n" + userTurns.map(turn =>
    "• “" + turn.message.trim().replace(/\s+/g, " ").slice(0, 180) + "”"
  ).join("\n") + "\n\n" + outro;
}
