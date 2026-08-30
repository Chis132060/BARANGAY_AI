"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  User, Send, Lock, ArrowRight,
  FileText, Globe, AlertCircle, Clock, Volume2, VolumeX, Loader2, Mic, MicOff, Check,
  ChevronRight, Sparkles, HelpCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InChatFormCard } from "./InChatFormCard";
import { GuestAuthModal } from "@/components/guest/GuestAuthModal";
import { useTTS, TTSLanguage } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import { getVerifiedQuestionSuggestions } from "@/lib/ai/policy-knowledge";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  timestamp?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectFormTrigger(text: string, isLoggedIn: boolean): { formType?: string; formTitle?: string; guestActionTrigger?: boolean } {
  const FORM_KEYWORDS: { pattern: RegExp; formType: string; formTitle: string }[] = [
    { pattern: /barangay clearance/i, formType: "clearance", formTitle: "Barangay Clearance" },
    { pattern: /indigency/i, formType: "indigency", formTitle: "Certificate of Indigency" },
    { pattern: /residency/i, formType: "residency", formTitle: "Certificate of Residency" },
    { pattern: /business clearance|business permit/i, formType: "business", formTitle: "Business Clearance" },
  ];
  for (const { pattern, formType, formTitle } of FORM_KEYWORDS) {
    if (pattern.test(text)) {
      if (isLoggedIn) return { formType, formTitle };
      return { guestActionTrigger: true };
    }
  }
  return {};
}

function formatTime(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ChatInterface() {
  const welcomeByLanguage: Record<TTSLanguage, string> = {
    tgl: "Kumusta! Ako ang iyong Smart Barangay AI Assistant.\n\nMaaari mong itanong ang:\n\u2022 Mga kailangan sa Barangay Clearance\n\u2022 Mga ordinansa at patakaran\n\u2022 Certificate of Indigency\n\u2022 Oras ng opisina\n\u2022 Mga aktibidad ng barangay\n\nGumagamit ako ng opisyal na dokumento ng Barangay para sa mas tumpak na sagot.",
    ceb: "Maayong adlaw! Ako ang imong Smart Barangay AI Assistant.\n\nMahimo kang mangutana bahin sa:\n\u2022 Mga kinahanglanon sa Barangay Clearance\n\u2022 Mga ordinansa ug polisiya\n\u2022 Certificate of Indigency\n\u2022 Oras sa opisina\n\u2022 Mga kalihokan sa barangay\n\nGigamit nako ang opisyal nga mga dokumento sa Barangay alang sa tukmang tubag.",
    en: "Hello! I am your Smart Barangay AI Assistant.\n\nYou can ask about:\n\u2022 Barangay Clearance requirements\n\u2022 Ordinances and policies\n\u2022 Certificate of Indigency\n\u2022 Office hours\n\u2022 Community events\n\nI use official Barangay documents to provide accurate answers.",
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", sender: "ai", text: welcomeByLanguage["tgl"], timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [sessionId] = useState<string>(() => uuidv4());
  const [ttsLang, setTtsLang] = useState<TTSLanguage>("tgl");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lastVoiceReplyRef = useRef<string | null>(null);
  const voiceIntroLanguageRef = useRef<TTSLanguage | null>(null);
  const { speak, stop, speakingId, loadingId } = useTTS();
  const { isListening, isSupported, startListening, toggleListening, stopListening } = useSTT();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load verified suggestions for the active language
  const verifiedSuggestions = getVerifiedQuestionSuggestions(ttsLang);

  // true only on first load before any user message
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
    if (!voiceMode || !isSupported || isListening || loading || speakingId) return;
    const timer = window.setTimeout(() => {
      startListening(ttsLang, (transcribedText) => {
        setInput(transcribedText);
        window.setTimeout(() => formRef.current?.requestSubmit(), 0);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [voiceMode, isSupported, isListening, loading, speakingId, startListening, ttsLang]);

  const selectLanguage = (language: TTSLanguage) => {
    setTtsLang(language);
    window.localStorage.setItem("barangay-ai-language", language);
    setShowLanguagePicker(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = useCallback(async (e: React.FormEvent, overrideText?: string) => {
    e.preventDefault();
    const text = overrideText ?? input;
    if (!text.trim() || loading) return;

    const userText = text.trim();
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

    if (isLoggedIn) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          sender: "user",
          message: userText,
          session_id: null,
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
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const aiText: string = data.answer ?? "";
      const citations: string[] = data.citations ?? [];
      const contextUsed: boolean = data.context_used ?? false;
      const detectedForm = detectFormTrigger(aiText, isLoggedIn);
      const finalFormType = (isLoggedIn && (data.formType || detectedForm.formType)) || undefined;
      const finalFormTitle = (isLoggedIn && (data.formTitle || detectedForm.formTitle)) || undefined;
      const guestTrigger = !isLoggedIn && (data.guestActionTrigger || detectedForm.guestActionTrigger);

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiText,
        citations,
        contextUsed,
        timestamp: Date.now(),
        formType: finalFormType,
        formTitle: finalFormTitle,
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
          });
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
      setLoading(false);
    }
  }, [input, loading, isLoggedIn, sessionId, supabase, ttsLang]);

  const handleSuggestion = (query: string) => {
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSend(syntheticEvent, query);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Barangay Logo" className="h-9 w-auto object-contain shrink-0" />
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight">Smart Barangay AI</h1>
            <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1 mt-0.5">
              {isLoggedIn ? (
                <><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-0.5" />Resident Mode</>
              ) : (
                <><span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300 mr-0.5" />Guest Mode</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
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
                if (v) { stopListening(); voiceIntroLanguageRef.current = null; }
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
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-[11px] text-gray-500 shrink-0">
          <Globe className="h-3 w-3 text-gray-400 shrink-0" />
          <span>
            Browsing as guest.{" "}
            <Link href="/login" className="text-blue-600 font-semibold">Sign in</Link>
            {" "}to track requests &amp; submit applications.
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
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="p-4 space-y-4">

          {/* Welcome hero card - shown only before first user message */}
          {isWelcomeOnly && (
            <div className="flex flex-col items-center text-center pt-4 pb-2">
              <img src="/logo.png" alt="AI" className="h-14 w-14 object-contain mb-3" />
              <h2 className="text-base font-bold text-gray-900">Smart Barangay AI</h2>
              <p className="text-xs text-gray-500 mt-1 max-w-[280px] leading-relaxed">
                {ttsLang === "tgl"
                  ? "Pumili sa mga opisyal na katanungan sa ibaba para sa agarang sagot at application form:"
                  : ttsLang === "ceb"
                  ? "Pilia ang opisyal nga mga pangutana sa ubos alang sa dali nga tubag ug application form:"
                  : "Select an official question below for instant verified answers and application forms:"}
              </p>

              {/* Predefined Clickable Questions (Verified Answers Only) */}
              <div className="mt-5 w-full max-w-sm space-y-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-blue-900 mb-1 px-1">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                  <span>Available Official Topics</span>
                </div>
                {verifiedSuggestions.map((s) => (
                  <button
                    key={s.topicId}
                    type="button"
                    onClick={() => handleSuggestion(s.query)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-left text-xs font-medium text-gray-800 hover:text-blue-700 transition-all group shadow-2xs"
                  >
                    <div>
                      <span className="block font-bold text-[11px] text-blue-900 group-hover:text-blue-700">{s.label}</span>
                      <span className="block text-[10px] text-gray-500">{s.query}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((m) => {
            const isUser = m.sender === "user";
            // Hide the welcome text bubble when hero is shown
            if (m.id === "welcome" && isWelcomeOnly) return null;
            return (
              <div key={m.id} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
                {/* AI avatar */}
                {!isUser && (
                  m.isError ? (
                    <div className="h-7 w-7 bg-red-50 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-red-100">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    </div>
                  ) : (
                    <img src="/logo.png" alt="AI" className="h-7 w-7 object-contain shrink-0 mt-0.5" />
                  )
                )}

                <div className={`max-w-[85%] space-y-1.5 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  {/* Bubble */}
                  <div className={`px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-2xl rounded-br-sm font-medium shadow-2xs"
                      : m.isError
                      ? "bg-red-50 text-red-700 rounded-2xl rounded-bl-sm border border-red-100"
                      : "bg-gray-50 text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100"
                  }`}>
                    <p className="whitespace-pre-line">{m.text}</p>
                  </div>

                  {/* Timestamp */}
                  {m.timestamp && (
                    <span className="text-[9px] text-gray-400 px-1">{formatTime(m.timestamp)}</span>
                  )}

                  {/* TTS Controls */}
                  {!isUser && !m.isError && (
                    <div className="flex items-center gap-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => speak(m.id, m.text, ttsLang)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-full border transition-all ${
                          speakingId === m.id
                            ? "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700"
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
                      <select
                        value={ttsLang}
                        onChange={(e) => selectLanguage(e.target.value as TTSLanguage)}
                        className="text-[10px] bg-white border border-gray-200 text-gray-500 rounded-full px-2 py-0.5 outline-none font-medium cursor-pointer hover:border-gray-300 transition-colors"
                      >
                        <option value="tgl">Tagalog</option>
                        <option value="ceb">Cebuano</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  )}

                  {/* Citation badges */}
                  {!isUser && m.citations && m.citations.length > 0 && (
                    <div className="flex flex-wrap gap-1 px-1">
                      {m.citations.slice(0, 3).map((cid, i) => (
                        <span key={cid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full border border-blue-100">
                          <FileText className="h-2.5 w-2.5" />{cid.startsWith("policy") ? "Official Policy" : cid}
                        </span>
                      ))}
                      {!m.contextUsed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-medium rounded-full border border-amber-100">
                          <AlertCircle className="h-2.5 w-2.5" /> Official Barangay Record
                        </span>
                      )}
                    </div>
                  )}

                  {/* Dynamic In-Chat Multi-Document Form */}
                  {m.formType && m.formTitle && (
                    <div className="w-full">
                      <InChatFormCard formType={m.formType} title={m.formTitle} sessionId={sessionId} />
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

                {/* User avatar */}
                {isUser && (
                  <div className="h-7 w-7 bg-gray-100 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-gray-200">
                    <User className="h-3.5 w-3.5 text-gray-500" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2.5 items-end">
              <img src="/logo.png" alt="AI" className="h-7 w-7 object-contain shrink-0" />
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Persistent Clickable Question Chips during conversation */}
      {!isWelcomeOnly && (
        <div className="px-3 py-1.5 bg-gray-50/80 border-t border-gray-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {verifiedSuggestions.slice(0, 5).map((s) => (
            <button
              key={s.topicId}
              type="button"
              onClick={() => handleSuggestion(s.query)}
              className="shrink-0 px-3 py-1 rounded-full bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 text-[10px] font-semibold transition-all shadow-2xs"
            >
              {s.label}
            </button>
          ))}
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
                if (voiceMode) setTimeout(() => formRef.current?.requestSubmit(), 0);
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
            className="h-10 w-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-2xl flex items-center justify-center transition-all shrink-0"
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
