import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const helper = read("../lib/ai/sora-chat-memory.ts");
const chat = read("../components/chat/ChatInterface.tsx");
const drawer = read("../components/chat/ChatHistoryPanel.tsx");
const route = read("../app/api/chat/route.ts");
const agent = read("../lib/ai/sora-agent.ts");
const migration = read("../../../supabase/migrations/20261117032000_ate_sora_chat_history_and_opt_in_memory.sql");

const exports = {};
const transpiled = ts.transpileModule(helper, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(transpiled.diagnostics?.filter(x => x.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
vm.runInNewContext(transpiled.outputText, { exports, URL, Date });
const { getResidentChatMemory, isChatMemoryQuestion, buildSavedConversationRecall } = exports;

const userId = "11111111-1111-4111-8111-111111111111";
const token = "22222222-2222-4222-8222-222222222222";
const sessionId = "33333333-3333-4333-8333-333333333333";
function row(id, sender, message, session_id = sessionId) {
  return { id, sender, message, session_id, created_at: "2026-11-17T03:00:00Z" };
}

function fakeDb({ preference = false, current = [], previous = [], errorPref = false } = {}) {
  const calls = [];
  const db = {
    calls,
    from(table) {
      calls.push({ table });
      const selectors = [];
      let q = {
        select() { return q; },
        eq(key, val) { selectors.push([key, val]); return q; },
        neq(key, val) { selectors.push(["!" + key, val]); return q; },
        order() { return q; },
        limit() {
          const previousQuery = selectors.some(([k]) => k === "!session_id");
          return Promise.resolve({ data: previousQuery ? previous : current, error: null });
        },
        maybeSingle() {
          if (table === "chat_sessions") return Promise.resolve({
            data: { id: sessionId, user_id: userId }, error: null,
          });
          return Promise.resolve({
            data: { remember_previous_chats: preference },
            error: errorPref ? { message: "RLS error" } : null,
          });
        },
      };
      return q;
    },
  };
  return db;
}

test("only the current chat is used by default; past sessions require explicit opt-in", async () => {
  const db = fakeDb({
    current: [row("1", "user", "Paano kumuha ng clearance?")],
    previous: [row("2", "user", "May issue ako sa kapitbahay", "other")],
  });
  const memory = await getResidentChatMemory(db, userId, token);
  assert.equal(memory.remembersOtherChats, false);
  assert.match(memory.context, /Paano kumuha ng clearance/);
  assert.doesNotMatch(memory.context, /kapitbahay/);
  assert.equal(db.calls.filter(c => c.table === "chat_messages").length, 1);
});

test("with opt-in, same user's previous session messages can be recalled", async () => {
  const db = fakeDb({
    preference: true,
    current: [row("1", "ai", "Pwede kang magtanong.")],
    previous: [row("2", "user", "Nag-apply ako ng clearance", "older")],
  });
  const memory = await getResidentChatMemory(db, userId, token);
  assert.equal(memory.remembersOtherChats, true);
  assert.match(memory.context, /Nag-apply ako ng clearance/);
  assert.equal(db.calls.filter(c => c.table === "chat_messages").length, 2);
});

test("failed preference read fails closed; invalid user or token never touches DB", async () => {
  const db = fakeDb({ preference: true, errorPref: true });
  assert.equal((await getResidentChatMemory(db, userId, token)).context, "");
  assert.equal((await getResidentChatMemory(db, "invalid", token)).turns.length, 0);
  assert.equal((await getResidentChatMemory(db, userId, "invalid")).turns.length, 0);
  assert.equal(db.calls.filter(c => c.table === "chat_messages").length, 0);
});

test("explicit recall quotes old user turns but not the current question", async () => {
  const memory = await getResidentChatMemory(fakeDb({
    preference: true,
    current: [
      row("3", "user", "Naalala mo ba ang sinabi ko dati?"),
      row("2", "user", "Nagtanong ako tungkol sa basura"),
      row("1", "ai", "Pwede kang mag-report."),
    ],
  }), userId, token);
  const answer = buildSavedConversationRecall(memory, "tgl", "Naalala mo ba ang sinabi ko dati?");
  assert.match(answer, /Nagtanong ako tungkol sa basura/);
  assert.doesNotMatch(answer, /“Naalala mo ba ang sinabi ko dati\?”/);
  assert.equal(isChatMemoryQuestion("naaalala mo ba ang pinag-usapan natin?"), true);
  assert.equal(isChatMemoryQuestion("Paano kumuha ng Certificate of Residency?"), false);
});

test("chat history is hydrated per-resident and survives a new conversation", () => {
  assert.match(chat, /from\("chat_sessions"\)[\s\S]*?\.eq\("user_id", uid\)/);
  assert.match(chat, /from\("chat_messages"\)[\s\S]*?\.eq\("user_id", authUserId!\)/);
  assert.match(chat, /window\.localStorage\.getItem\(memoryKey\(authUserId!\)\)/);
  assert.match(chat, /setSessionId\(target\.session_token\)/);
  assert.match(chat, /setMessages\(fromSavedRows\(rows \?\? \[\]\)\)/);
  assert.match(chat, /function resetChat\(\)/);
  assert.match(chat, /setSessionId\(uuidv4\(\)\)/);
  assert.doesNotMatch(chat.slice(chat.indexOf("function resetChat()"), chat.indexOf("const handleSend")),
    /\.delete\(\)|\.remove\(\)/);
  assert.match(chat, /<ChatHistoryPanel/);
  assert.match(drawer, /My Ate Sora Chats/);
  assert.match(drawer, /Remember previous chats/);
});

test("form, voice and submission receipt turns are saved in authenticated session", () => {
  assert.match(chat, /persistLocalExchange\(reply\.transcript, reply\.answer/);
  assert.match(chat, /persistLocalExchange\(userText, formReplyText/);
  assert.match(chat, /persistLocalMessage\("ai", receiptText/);
  assert.match(chat, /onSubmitted=\{reference => handleFormSubmitted/);
  assert.match(chat, /formType: undefined, formTitle: undefined, formSchema: undefined/);
});

test("memory only uses authorized owner history and never overrides official current-question grounding", () => {
  assert.match(helper, /\.eq\("user_id", userId\)/);
  assert.match(helper, /\.eq\("session_token", sessionToken\)/);
  assert.match(route, /getResidentChatMemory\(supabase, user\.id, sessionId\)/);
  assert.match(route, /isChatMemoryQuestion\(message\)/);
  assert.match(route, /query: "RESIDENT_CHAT_MEMORY_RECALL"/);
  assert.match(agent, /const query = request\.message/);
  assert.match(agent, /untrusted_prior_conversation_excerpts/);
  assert.doesNotMatch(agent, /createAdminClient|SUPABASE_SERVICE_ROLE_KEY/);
});

test("database RLS prevents accessing another user's memories or linking messages to their sessions", () => {
  assert.match(migration, /ALTER TABLE public\.sora_chat_memory_preferences ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /DEFAULT false/);
  assert.match(migration, /REVOKE ALL ON public\.sora_chat_memory_preferences FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /WITH CHECK \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(migration, /WHERE s\.id = session_id AND s\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /NEW\.sender = 'user'/);
});

test("offline chat retains cached resident identity without claiming server verification", () => {
  assert.match(chat, /supabase\.auth\.getSession\(\)/);
  assert.match(chat, /if \(navigator\.onLine\) \{[\s\S]*?await supabase\.auth\.getUser\(\)/);
  assert.match(chat, /setCachedAuthUnverified\(!!user && unverified\)/);
  assert.match(chat, /Cached resident session · not yet verified/);
  assert.match(chat, /setHistoryError\("Saved chat history needs an internet connection/);
  assert.match(chat, /if \(!navigator\.onLine\) \{/);
  assert.match(chat, /This question was not sent or saved to the server/);
  assert.match(drawer, /!props\.sessions\.length && !props\.error/);
});
