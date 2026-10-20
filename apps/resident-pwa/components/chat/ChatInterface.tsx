"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  User, Send, Lock, ArrowRight, RotateCcw,
  FileText, Globe, AlertCircle, Clock, Volume2, VolumeX, Loader2, Mic, MicOff, Check,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InChatFormCard } from "./InChatFormCard";
import { GuestAuthModal } from "@/components/guest/GuestAuthModal";
import { useTTS, TTSLanguage } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import { DOCUMENT_FORMS, isDocumentFormId, requestedDocumentForm } from "@/lib/ai/document-forms";
import { getVerifiedQuestionSuggestions } from "@/lib/ai/policy-knowledge";
import { getAIGreeting, AI_NAME } from "../../lib/ai/config";
import Link from "next/link";

const SORA_AVATAR = "/ate-sora.jpg";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  formType?: string;
  formTitle?: string;
  formSchema?: any;
  guestActionTrigger?: boolean;
  citations?: string[];
  contextUsed?: boolean;
  isError?: boolean;
  timestamp?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectFormTrigger(text: string, isLoggedIn: boolean): { formType?: string; formTitle?: string; guestActionTrigger?: boolean } {
  const id = requestedDocumentForm(text);
  if (!id) return {};
  if (!isLoggedIn) return { guestActionTrigger: true };
  return { formType: id, formTitle: DOCUMENT_FORMS[id].title };
}

function formatTime(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatInterface() {
  const welcomeByLanguage: Record<TTSLanguage, string> = {
    tgl: `${getAIGreeting('tagalog')}\n\nMaaari mong itanong ang:\n• Mga kailangan sa Barangay Clearance\n• Mga ordinansa at patakaran\n• Certificate of Indigency\n• Oras ng opisina\n• Mga aktibidad ng barangay\n\nGumagamit ako ng opisyal na dokumento ng Barangay para sa mas tumpak na sagot.`,
    ceb: `${getAIGreeting('cebuano')}\n\nMahimo kang mangutana bahin sa:\n• Mga kinahanglanon sa Barangay Clearance\n• Mga ordinansa ug polisiya\n• Certificate of Indigency\n• Oras sa opisina\n• Mga kalihokan sa barangay\n\nGigamit nako ang opisyal nga mga dokumento sa Barangay alang sa tukmang tubag.`,
    en: `${getAIGreeting('english')}\n\nYou can ask about:\n• Barangay Clearance requirements\n• Ordinances and policies\n• Certificate of Indigency\n• Office hours\n• Community events\n\nI use official Barangay documents to provide accurate answers.`,
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", sender: "ai", text: welcomeByLanguage["tgl"], timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInitials, setUserInitials] = useState<string>("");
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [sessionId] = useState<string>(() => uuidv4());
  const [ttsLang, setTtsLang] = useState<TTSLanguage>("tgl");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const voiceTranscriptRef = useRef<string | null>(null);
  const voiceRequestInFlightRef = useRef(false);
  const lastVoiceReplyRef = useRef<string | null>(null);
  const voiceIntroLanguageRef = useRef<TTSLanguage | null>(null);
  const { speak, stop: stopSpeaking, speakingId, loadingId } = useTTS();
  const { isListening, isSupported, startListening, toggleListening, stopListening } = useSTT();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const soraIsSpeaking = Boolean(speakingId || loadingId);
  const voiceModeRef = useRef(false);
  voiceModeRef.current = voiceMode;

  const verifiedSuggestions = getVerifiedQuestionSuggestions(ttsLang);
  const isWelcomeOnly = messages.length === 1 && messages[0].id === "welcome";

  useEffect(() => {
    const saved = window.localStorage.getItem("barangay-ai-language") as TTSLanguage | null;
    if (saved === "tgl" || saved === "ceb" || saved === "en") setTtsLang(saved);
    else setShowLanguagePicker(true);
  }, []);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (user) {
        const rawName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "";
        const initials = rawName
          .split(/[\s._-]+/)
          .map((w: string) => w[0] || "")
          .join("")
          .toUpperCase()
          .slice(0, 2);
        setUserInitials(initials || "U");
      }
    }
    checkAuth();
  }, [supabase]);

  useEffect(() => {
    setMessages((current) =>
      current.map((message) =>
        message.id === "welcome" ? { ...message, text: welcomeByLanguage[ttsLang] } : message
      )
    );
  }, [ttsLang]);

  useEffect(() => {
    if (!voiceMode || loading) return;
    const latest = messages[messages.length - 1];
    if (latest?.sender === "ai" && latest.id !== "welcome" && !latest.isError && lastVoiceReplyRef.current !== latest.id) {
      lastVoiceReplyRef.current = latest.id;
      speak(latest.id, latest.text, ttsLang);
    }
  }, [voiceMode, loading, messages, speak, ttsLang]);

  useEffect(() => {
    if (!voiceMode || voiceIntroLanguageRef.current === ttsLang) return;
    voiceIntroLanguageRef.current = ttsLang;
    const greeting: Record<TTSLanguage, string> = {
      tgl: "Kumusta! Ako ang Barangay AI. Voice Mode na tayo. Magsalita ka lang pagkatapos ng aking pagbati at awtomatiko kitang sasagutin.",
      ceb: "Maayong adlaw! Ako ang Barangay AI. Aktibo na ang Voice Mode. Pagsulti lang human sa akong pagtimbaya ug tubagon tika dayon.",
      en: "Hello! I am Barangay AI. Voice Mode is now active. Speak after my greeting and I will answer you automatically.",
    };
    speak("voice-intro", greeting[ttsLang], ttsLang);
  }, [voiceMode, ttsLang, speak]);

  useEffect(() => {
    if (!voiceMode || !isSupported || isListening || loading || speakingId || loadingId || voiceRequestInFlightRef.current) return;
    const timer = window.setTimeout(() => {
      startListening(ttsLang, (transcribedText) => {
        if (!voiceModeRef.current) return;
        voiceRequestInFlightRef.current = true;
        voiceTranscriptRef.current = transcribedText;
        setInput(transcribedText);
        window.setTimeout(() => {
          if (voiceModeRef.current) formRef.current?.requestSubmit();
        }, 0);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [voiceMode, isSupported, isListening, loading, speakingId, loadingId, startListening, ttsLang]);

  const selectLanguage = (language: TTSLanguage) => {
    setTtsLang(language);
    window.localStorage.setItem("barangay-ai-language", language);
    setShowLanguagePicker(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function resetChat() {
    setMessages([{ id: "welcome", sender: "ai", text: welcomeByLanguage[ttsLang], timestamp: Date.now() }]);
    setInput("");
    voiceTranscriptRef.current = null;
    setRateLimited(false);
  }

  const handleSend = useCallback(async (e: React.FormEvent, overrideText?: string) => {
    e.preventDefault();
    const text = overrideText ?? voiceTranscriptRef.current ?? input;
    voiceTranscriptRef.current = null;
    if (!text.trim() || loading) { voiceRequestInFlightRef.current = false; return; }

    const userText = text.trim();
    const userFormRequest = detectFormTrigger(userText, isLoggedIn);
    setInput("");
    setRateLimited(false);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    let persistedSessionId: string | null = null;
    if (isLoggedIn) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: persistedSession, error: sessionError } = await supabase.from("chat_sessions").upsert({
          user_id: user.id,
          session_token: sessionId,
          last_active_at: new Date().toISOString(),
        }, { onConflict: "session_token" }).select("id").single();
        if (sessionError) console.warn("Unable to save chat session:", sessionError.message);
        persistedSessionId = persistedSession?.id ?? null;
        if (persistedSessionId) await supabase.from("chat_messages").insert({
          user_id: user.id,
          sender: "user",
          message: userText,
          session_id: persistedSessionId,
        });
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, sessionId, language: ttsLang }),
      });

      if (res.status === 429) {
        setRateLimited(true);
        setMessages((prev) => [...prev, {
          id: `ai-err-${Date.now()}`,
          sender: "ai",
          text: "You're sending messages too quickly. Please wait a moment before asking again.",
          isError: true,
          timestamp: Date.now(),
        }]);
        voiceRequestInFlightRef.current = false;
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const aiText: string = data.answer ?? "";
      const citations: string[] = data.citations ?? [];
      const contextUsed: boolean = data.context_used ?? false;
      // Never open a form because an AI answer merely mentioned a document.
      // A real resident request and a known existing form ID are both required.
      const formId = userFormRequest.formType && isDocumentFormId(userFormRequest.formType)
        ? userFormRequest.formType : null;
      const finalFormType = formId ?? undefined;
      const finalFormTitle = formId ? DOCUMENT_FORMS[formId].title : undefined;
      const finalFormSchema = formId && data.formSchema && typeof data.formSchema === "object"
        ? data.formSchema : undefined;
      const guestTrigger = Boolean(userFormRequest.guestActionTrigger);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiText,
        citations,
        contextUsed,
        timestamp: Date.now(),
        formType: finalFormType,
        formTitle: finalFormTitle,
        formSchema: finalFormSchema,
        guestActionTrigger: guestTrigger,
      };
      setMessages((prev) => [...prev, aiMsg]);

      if (isLoggedIn) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            sender: "ai",
            message: aiText,
            form_type: finalFormType ?? null,
            citations: citations,
            model_used: "gemini-1.5-flash",
            session_id: persistedSessionId,
          });
          await supabase.from("chat_sessions").update({
            last_active_at: new Date().toISOString(),
          }).eq("session_token", sessionId).eq("user_id", user.id);
        }
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: err?.message || "Hindi makakonekta sa Barangay AI ngayon. Pakisubukan muli.",
        isError: true,
        timestamp: Date.now(),
      }]);
    } finally {
      voiceRequestInFlightRef.current = false;
      setLoading(false);
    }
  }, [input, loading, isLoggedIn, sessionId, supabase, ttsLang]);

  const handleSuggestion = (query: string) => {
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSend(syntheticEvent, query);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative flex flex-col h-screen max-w-lg mx-auto bg-white overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={SORA_AVATAR} alt="Ate Sora" className="h-9 w-9 rounded-full object-cover object-top shrink-0 ring-2 ring-blue-100" />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-gray-900 leading-tight">{AI_NAME}</h1>
            <p className="text-[10px] font-medium flex items-center gap-1 mt-0.5">
              {isLoggedIn ? (
                <><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-0.5" /><span className="text-green-600">Resident Mode</span></>
              ) : (
                <><span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300 mr-0.5" /><span className="text-gray-400">Guest Mode</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* New chat button — only visible during a conversation */}
          {!isWelcomeOnly && (
            <button
              type="button"
              onClick={resetChat}
              title="New conversation"
              aria-label="New conversation"
              className="h-8 w-8 rounded-full bg-gray-50 border border-gray-200 text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLanguagePicker(true)}
            aria-label="Change language"
            className="h-8 px-2.5 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 text-[11px] font-bold border border-gray-200 uppercase tracking-wide transition-colors"
          >
            {ttsLang}
          </button>
          <button
            type="button"
            onClick={() => {
              setVoiceMode((v) => {
                if (v) { stopListening(); stopSpeaking(); voiceIntroLanguageRef.current = null; }
                return !v;
              });
            }}
            aria-label="Voice mode"
            className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all ${
              voiceMode
                ? "bg-blue-600 text-white border-blue-600 shadow"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
          </button>
          {!isLoggedIn && (
            <Link
              href="/login"
              className="h-8 px-3 bg-blue-600 text-white hover:bg-blue-700 rounded-full text-[11px] font-bold transition-all flex items-center gap-1"
            >
              Sign in <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Guest info strip */}
      {!isLoggedIn && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-[11px] text-gray-400 shrink-0">
          <Globe className="h-3 w-3 shrink-0" />
          <span>
            Browsing as guest.{" "}
            <Link href="/login" className="text-blue-600 font-semibold">Sign in</Link>
            {" "}to track requests & submit applications.
          </span>
        </div>
      )}

      {/* Rate-limit warning */}
      {rateLimited && (
        <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-2 text-[11px] text-orange-700 shrink-0">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Too many messages. Please slow down a bit.</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white no-scrollbar">
        <div className="p-4 space-y-4">

          {/* Welcome hero — shown only before first user message */}
          {isWelcomeOnly && (
            <div className="flex flex-col items-center text-center pt-6 pb-2">
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-900">{AI_NAME}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Official Multilingual Assistant</p>
              </div>
              <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed mb-6">
                {ttsLang === "tgl"
                  ? "Pumili sa mga opisyal na katanungan sa ibaba para sa agarang sagot at application form:"
                  : ttsLang === "ceb"
                  ? "Pilia ang opisyal nga mga pangutana sa ubos alang sa dali nga tubag ug application form:"
                  : "Select an official question below for instant verified answers and application forms:"}
              </p>

              {/* Topic list */}
              <div className="w-full max-w-sm space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
                  Official Topics
                </p>
                {verifiedSuggestions.map((s) => (
                  <button
                    key={s.topicId}
                    type="button"
                    onClick={() => handleSuggestion(s.query)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-left transition-all group shadow-2xs"
                  >
                    <div>
                      <span className="block font-semibold text-[11px] text-gray-800 group-hover:text-gray-900">{s.label}</span>
                      <span className="block text-[10px] text-gray-400 mt-0.5">{s.query}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((m) => {
            const isUser = m.sender === "user";
            if (m.id === "welcome" && isWelcomeOnly) return null;
            return (
              <div key={m.id} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                {/* AI avatar */}
                {!isUser && (
                  m.isError ? (
                    <div className="h-7 w-7 bg-gray-50 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-gray-200">
                      <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                  ) : (
                    <img src={SORA_AVATAR} alt="Ate Sora" className="h-7 w-7 rounded-full object-cover object-top shrink-0 mt-0.5 ring-1 ring-blue-100" />
                  )
                )}

                <div className={`max-w-[85%] space-y-1.5 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  {/* Bubble */}
                  <div className={`px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-2xl rounded-br-sm font-medium shadow-2xs"
                      : m.isError
                      ? "bg-gray-50 text-gray-600 rounded-2xl rounded-bl-sm border border-gray-200"
                      : "bg-gray-50 text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100"
                  }`}>
                    <p className="whitespace-pre-line">{m.text}</p>
                  </div>

                  {/* Timestamp */}
                  {m.timestamp && (
                    <span className="text-[9px] text-gray-300 px-1">{formatTime(m.timestamp)}</span>
                  )}

                  {/* TTS Controls — no language select, just the listen button */}
                  {!isUser && !m.isError && (
                    <div className="flex items-center gap-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => speak(m.id, m.text, ttsLang)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-full border transition-all ${
                          speakingId === m.id
                            ? "bg-gray-100 text-gray-600 border-gray-200"
                            : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50 hover:text-gray-600"
                        }`}
                      >
                        {loadingId === m.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : speakingId === m.id ? (
                          <VolumeX className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        <span>{loadingId === m.id ? "Loading..." : speakingId === m.id ? "Stop" : "Listen"}</span>
                      </button>
                    </div>
                  )}

                  {/* Citation badges — neutral style */}
                  {!isUser && m.citations && m.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-1">
                      {m.citations.slice(0, 3).map((cid) => (
                        <span key={cid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-medium rounded-full border border-gray-200">
                          <FileText className="h-2.5 w-2.5" />{cid.startsWith("policy") ? "Official Policy" : cid}
                        </span>
                      ))}
                      {!m.contextUsed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-400 text-[10px] font-medium rounded-full border border-gray-200">
                          <AlertCircle className="h-2.5 w-2.5" /> Official Record
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dynamic In-Chat Form */}
                  {m.formType && m.formTitle && (
                    <div className="w-full">
                      <InChatFormCard formType={m.formType} title={m.formTitle} sessionId={sessionId} formSchema={m.formSchema} />
                    </div>
                  )}

                  {/* Guest CTA */}
                  {m.guestActionTrigger && (
                    <Link
                      href="/login"
                      className="flex items-center justify-center gap-2 mt-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs"
                    >
                      <Lock className="h-3.5 w-3.5" /> Sign In to Submit Application Form
                    </Link>
                  )}
                </div>

                {/* User avatar — initials when logged in, icon when guest */}
                {isUser && (
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                    isLoggedIn && userInitials
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}>
                    {isLoggedIn && userInitials ? userInitials : <User className="h-3.5 w-3.5" />}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2.5 items-end">
              <img src={SORA_AVATAR} alt="Ate Sora" className="h-7 w-7 rounded-full object-cover object-top shrink-0 ring-1 ring-blue-100" />
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Speaking presence overlay */}
      {soraIsSpeaking && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]" aria-hidden="true">
          <div className="relative h-48 w-48">
            <span className="absolute inset-0 rounded-full bg-blue-300/25 animate-ping" />
            <span className="absolute -inset-3 rounded-full border border-blue-200/80 animate-pulse" />
            <div className="relative h-full w-full overflow-hidden rounded-full bg-blue-50 shadow-2xl shadow-slate-950/30 ring-4 ring-white/90">
              <img src={SORA_AVATAR} alt="Ate Sora is speaking" className="h-full w-full object-cover object-top" />
              <span className="absolute left-1/2 top-[62%] h-3 w-7 -translate-x-1/2 rounded-full bg-[#9D3E55] shadow-sm animate-pulse" aria-hidden="true" />
            </div>
          </div>
        </div>
      )}

      {/* Persistent topic chips during conversation — with right fade */}
      {!isWelcomeOnly && (
        <div className="relative border-t border-gray-100 shrink-0">
          <div className="px-3 py-1.5 bg-gray-50/80 flex gap-1.5 overflow-x-auto no-scrollbar">
            {verifiedSuggestions.slice(0, 5).map((s) => (
              <button
                key={s.topicId}
                type="button"
                onClick={() => handleSuggestion(s.query)}
                className="shrink-0 px-3 py-1 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 text-[10px] font-medium transition-all shadow-2xs"
              >
                {s.label}
              </button>
            ))}
          </div>
          {/* Fade-out gradient on the right */}
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Voice mode status bar */}
      {voiceMode && (
        <div className="px-4 py-2.5 bg-blue-50 border-t border-blue-100 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs font-bold text-blue-800">Voice Mode Active</p>
            <p className="text-[10px] text-blue-600 mt-0.5">
              Speak in {ttsLang === "tgl" ? "Tagalog" : ttsLang === "ceb" ? "Cebuano" : "English"} — AI will respond automatically.
            </p>
          </div>
          {isListening && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Listening
            </span>
          )}
          {!isSupported && (
            <span className="text-[10px] text-red-500 font-medium">Browser not supported. Use Chrome.</span>
          )}
        </div>
      )}

      {/* Input bar */}
      <form
        ref={formRef}
        onSubmit={handleSend}
        className="px-3 py-3 border-t border-gray-100 bg-white flex items-center gap-2 shrink-0"
      >
        <div className={`flex-1 flex items-center rounded-2xl border px-3.5 py-2 gap-2 transition-all ${
          isListening
            ? "border-red-300 bg-red-50/40"
            : "border-gray-200 bg-gray-50 focus-within:border-blue-300 focus-within:bg-white"
        }`}>
          <input
            type="text"
            placeholder={
              isListening
                ? `Listening in ${ttsLang === "ceb" ? "Cebuano" : ttsLang === "tgl" ? "Tagalog" : "English"}...`
                : isLoggedIn
                ? "Ask me anything about barangay services..."
                : "Ask about clearance, policies, office hours..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`flex-1 bg-transparent text-xs outline-none text-gray-800 placeholder-gray-400 ${
              isListening ? "text-red-700 placeholder-red-400 animate-pulse font-medium" : ""
            }`}
          />
          {!voiceMode && (
            <button
              type="button"
              onClick={() => toggleListening(ttsLang, (transcribedText) => {
                setInput(transcribedText);
                // Manual microphone input only populates the field; resident confirms sending.
              })}
              title={isListening ? "Listening - click to stop" : "Voice input"}
              className={`h-7 w-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-transparent text-gray-400 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        {!voiceMode && (
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 w-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-300 text-white rounded-2xl flex items-center justify-center transition-all shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        )}
      </form>

      <GuestAuthModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />

      {/* Language picker modal */}
      {showLanguagePicker && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-base font-bold text-gray-900">Choose your language</h2>
                <p className="text-xs text-gray-400 mt-0.5">Used for AI responses, voice input &amp; playback.</p>
              </div>
              <button type="button" onClick={() => setShowLanguagePicker(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2">&#215;</button>
            </div>
            <div className="space-y-2 mt-4">
              {([["tgl", "Tagalog", "Filipino"], ["ceb", "Cebuano / Bisaya", "Visayan"], ["en", "English", "International"]] as const).map(([value, label, sub]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectLanguage(value)}
                  className={`w-full flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all ${
                    ttsLang === value ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${ttsLang === value ? "text-blue-700" : "text-gray-800"}`}>{label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                  </div>
                  {ttsLang === value && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
