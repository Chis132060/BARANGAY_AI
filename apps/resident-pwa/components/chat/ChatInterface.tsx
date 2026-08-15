"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Bot, User, Send, Sparkles, Lock, ArrowRight,
  FileText, Globe, AlertCircle, Clock, Volume2, VolumeX, Loader2, Mic, MicOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InChatFormCard } from "./InChatFormCard";
import { GuestAuthModal } from "@/components/guest/GuestAuthModal";
import { useTTS, TTSLanguage } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Citation {
  id: string;
}

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  formType?: string;
  formTitle?: string;
  guestActionTrigger?: boolean;
  citations?: string[];
  contextUsed?: boolean;
  isError?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Detect form trigger keywords in AI response to keep backward-compat */
function detectFormTrigger(text: string, isLoggedIn: boolean): { formType?: string; formTitle?: string; guestActionTrigger?: boolean } {
  const FORM_KEYWORDS: { pattern: RegExp; formType: string; formTitle: string }[] = [
    { pattern: /barangay clearance/i, formType: "clearance", formTitle: "Barangay Clearance" },
    { pattern: /indigency/i, formType: "indigency", formTitle: "Certificate of Indigency" },
    { pattern: /residency/i, formType: "residency", formTitle: "Certificate of Residency" },
    { pattern: /business clearance/i, formType: "business", formTitle: "Business Clearance" },
  ];

  for (const { pattern, formType, formTitle } of FORM_KEYWORDS) {
    if (pattern.test(text)) {
      if (isLoggedIn) return { formType, formTitle };
      return { guestActionTrigger: true };
    }
  }
  return {};
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Kumusta! I am your Smart Barangay AI Assistant.\n\nAsk me anything about:\n• 📄 Barangay Clearance requirements\n• 📋 Ordinances and policies\n• 🏥 Certificate of Indigency\n• 🕐 Office hours\n• 🎉 Community events\n\nI use real Barangay policy documents to give you accurate answers!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [sessionId] = useState<string>(() => uuidv4()); // stable per tab
  const [ttsLang, setTtsLang] = useState<TTSLanguage>("tgl");
  const { speak, stop, speakingId, loadingId } = useTTS();
  const { isListening, isSupported, toggleListening, stopListening } = useSTT();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // ── Auth + load saved messages ─────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      const loggedIn = !!user;
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        const { data: savedMsgs } = await supabase
          .from("chat_messages")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(50);

        if (savedMsgs && savedMsgs.length > 0) {
          setMessages(
            savedMsgs.map((m: any) => ({
              id: m.id,
              sender: m.sender,
              text: m.message,
              formType: m.form_type,
              citations: m.citations ?? [],
            }))
          );
        }
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");
    setRateLimited(false);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Persist user message (RLS ensures only logged-in users can write)
    if (isLoggedIn) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          sender: "user",
          message: userText,
          session_id: null, // session_id FK expects UUID from chat_sessions
        });
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, sessionId }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        const errorMsg: Message = {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "⏳ You're sending messages too quickly. Please wait a moment before asking again.",
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const aiText: string = data.answer ?? "";
      const citations: string[] = data.citations ?? [];
      const contextUsed: boolean = data.context_used ?? false;

      // Auto-detect form triggers from AI response
      const formHints = detectFormTrigger(aiText, isLoggedIn);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiText,
        citations,
        contextUsed,
        ...formHints,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Persist AI response
      if (isLoggedIn) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            sender: "ai",
            message: aiText,
            form_type: formHints.formType ?? null,
            citations: citations,
            model_used: "gemini-1.5-flash",
          });
        }
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: "⚠️ I'm having trouble connecting right now. Please try again in a moment.",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, isLoggedIn, sessionId, supabase]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white overflow-hidden">

      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Smart Barangay AI</h1>
            <p className="text-[10px] text-blue-100 font-medium flex items-center gap-1">
              {isLoggedIn ? (
                <>🔒 Resident Mode · RAG Active</>
              ) : (
                <><Globe className="h-2.5 w-2.5" /> Guest Mode · RAG Active</>
              )}
            </p>
          </div>
        </div>
        {!isLoggedIn && (
          <Link
            href="/login"
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border border-white/30"
          >
            Sign In <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Guest banner */}
      {!isLoggedIn && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-800 shrink-0">
          <Globe className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>
            <strong>Guest Mode</strong> — You can ask about policies.{" "}
            <Link href="/login" className="text-blue-700 font-semibold underline">
              Sign in
            </Link>{" "}
            to request documents &amp; track applications.
          </span>
        </div>
      )}

      {/* Rate-limit warning */}
      {rateLimited && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-xs text-red-700 shrink-0">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Too many messages. Please slow down a bit.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/40">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div key={m.id} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="h-7 w-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  {m.isError ? <AlertCircle className="h-3.5 w-3.5 text-red-500" /> : <Sparkles className="h-3.5 w-3.5" />}
                </div>
              )}
              <div className="max-w-[85%] space-y-1.5">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-blue-600 text-white rounded-br-none font-medium"
                      : m.isError
                      ? "bg-red-50 text-red-700 rounded-bl-none border border-red-200"
                      : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>

                {/* TTS Audio Listen Controls */}
                {!isUser && !m.isError && (
                  <div className="flex items-center gap-1.5 px-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => speak(m.id, m.text, ttsLang)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full border transition-all ${
                        speakingId === m.id
                          ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                          : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      }`}
                    >
                      {loadingId === m.id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                      ) : speakingId === m.id ? (
                        <VolumeX className="h-3 w-3 text-red-500" />
                      ) : (
                        <Volume2 className="h-3 w-3 text-blue-600" />
                      )}
                      <span>
                        {loadingId === m.id
                          ? "Loading..."
                          : speakingId === m.id
                          ? "Stop"
                          : "Listen"}
                      </span>
                    </button>

                    <select
                      value={ttsLang}
                      onChange={(e) => setTtsLang(e.target.value as TTSLanguage)}
                      className="text-[10px] bg-gray-50 border border-gray-200 text-gray-600 rounded-full px-2 py-0.5 outline-none font-medium focus:border-blue-400 cursor-pointer"
                    >
                      <option value="tgl">🇵🇭 Tagalog</option>
                      <option value="ceb">🇵🇭 Cebuano (Bisaya)</option>
                      <option value="en">🇺🇸 English</option>
                    </select>
                  </div>
                )}

                {/* Citation badges */}
                {!isUser && m.citations && m.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1">
                    {m.citations.slice(0, 3).map((cid, i) => (
                      <span
                        key={cid}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full border border-blue-200"
                      >
                        <FileText className="h-2.5 w-2.5" />
                        Source {i + 1}
                      </span>
                    ))}
                    {!m.contextUsed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-medium rounded-full border border-amber-200">
                        ⚠️ Verify with barangay staff
                      </span>
                    )}
                  </div>
                )}

                {/* In-chat form for residents */}
                {m.formType && m.formTitle && (
                  <InChatFormCard formType={m.formType} title={m.formTitle} />
                )}

                {/* Guest CTA */}
                {m.guestActionTrigger && (
                  <Link
                    href="/login"
                    className="w-full mt-1.5 p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl text-xs font-bold shadow-md hover:brightness-105 transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="h-3.5 w-3.5" /> Sign In / Register to Submit Application
                  </Link>
                )}
              </div>
              {isUser && (
                <div className="h-7 w-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          );
        })}

        {/* Thinking indicator */}
        {loading && (
          <div className="flex gap-2.5 items-center text-xs text-gray-400 font-medium">
            <div className="h-7 w-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm">
              <span className="animate-bounce delay-0">●</span>
              <span className="animate-bounce delay-75">●</span>
              <span className="animate-bounce delay-150">●</span>
              <span className="ml-1">Searching barangay documents…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t bg-white flex items-center gap-2 shrink-0 shadow-[0_-1px_6px_rgba(0,0,0,0.06)]"
      >
        <input
          type="text"
          placeholder={
            isListening
              ? `Listening in ${ttsLang === "ceb" ? "Cebuano" : ttsLang === "tgl" ? "Tagalog" : "English"}...`
              : isLoggedIn
              ? "Ask AI or request a document..."
              : "Ask about policies, clearance, ordinances..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className={`flex-1 border rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
            isListening
              ? "border-red-400 bg-red-50/50 text-red-900 font-medium placeholder-red-400 animate-pulse"
              : "border-gray-300 bg-gray-50 text-gray-800"
          }`}
        />

        {/* Speech-to-Text (STT) Microphone Button */}
        <button
          type="button"
          onClick={() =>
            toggleListening(ttsLang, (transcribedText) => {
              setInput(transcribedText);
            })
          }
          title={
            isListening
              ? "Listening... Click to stop"
              : `Voice Input (${ttsLang === "ceb" ? "Cebuano" : ttsLang === "tgl" ? "Tagalog" : "English"})`
          }
          className={`h-10 w-10 rounded-2xl flex items-center justify-center transition-all shadow shrink-0 ${
            isListening
              ? "bg-red-600 text-white animate-pulse"
              : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600 border border-gray-200"
          }`}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>

        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-all shadow disabled:opacity-40 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      <GuestAuthModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />
    </div>
  );
}
