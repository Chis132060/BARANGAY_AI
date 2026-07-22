"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bot, User, Send, Sparkles, Lock, ArrowRight,
  FileText, Globe, ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { findMatchingKnowledge } from "@/lib/ai/policy-knowledge";
import { InChatFormCard } from "./InChatFormCard";
import { GuestAuthModal } from "@/components/guest/GuestAuthModal";
import Link from "next/link";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  formType?: string;
  formTitle?: string;
  guestActionTrigger?: boolean;
}

// ────────────────────────────────────────────────────────────────────────────
// Simple AI response engine that uses fetched document content
// ────────────────────────────────────────────────────────────────────────────
function searchDocumentContent(query: string, documentContent: string): string | null {
  if (!documentContent) return null;

  const q = query.toLowerCase();

  // Split docs into paragraphs, score each by keyword overlap
  const paragraphs = documentContent
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  const queryWords = q
    .split(/\s+/)
    .filter((w) => w.length > 3 && !["what", "is", "the", "are", "how", "can", "mga", "ang", "yung", "yong"].includes(w));

  let bestParagraph = "";
  let bestScore = 0;

  for (const para of paragraphs) {
    const paraLower = para.toLowerCase();
    const score = queryWords.reduce((acc, word) => acc + (paraLower.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestParagraph = para;
    }
  }

  if (bestScore >= 1 && bestParagraph) {
    // Trim to a readable length
    const trimmed = bestParagraph.length > 600 ? bestParagraph.slice(0, 600) + "…" : bestParagraph;
    return trimmed;
  }
  return null;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Kumusta! I am your Smart Barangay AI Assistant.\n\nAsk me anything about:\n• 📄 Barangay Clearance requirements\n• 📋 Ordinances and policies\n• 🏥 Certificate of Indigency\n• 🕐 Office hours\n• 🎉 Community events\n\nI read real Barangay policy documents to answer your questions!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [documentContent, setDocumentContent] = useState("");
  const [docCount, setDocCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  // ── Auth check + load saved messages (RLS-protected) ────────────────────
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      const loggedIn = !!user;
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        // RLS: each user only sees their OWN chat_messages
        const { data: savedMsgs } = await supabase
          .from("chat_messages")
          .select("*")
          .order("created_at", { ascending: true });

        if (savedMsgs && savedMsgs.length > 0) {
          setMessages(
            savedMsgs.map((m: any) => ({
              id: m.id,
              sender: m.sender,
              text: m.message,
              formType: m.form_type,
            }))
          );
        }
      }
    }
    checkAuth();
  }, []);

  // ── Fetch policy document content from /api/policies ────────────────────
  useEffect(() => {
    fetch("/api/policies")
      .then((r) => r.json())
      .then(({ content, documentCount }) => {
        setDocumentContent(content || "");
        setDocCount(documentCount || 0);
      })
      .catch(() => {
        // Silently fall back to built-in knowledge base
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send + AI processing ─────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput("");

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Save user message to DB (RLS ensures guests cannot write)
    if (isLoggedIn) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          sender: "user",
          message: userText,
        });
      }
    }

    setTimeout(async () => {
      let aiReplyText = "";
      let formType: string | undefined;
      let formTitle: string | undefined;
      let guestActionTrigger = false;

      // 1️⃣ Try matching against real policy documents first
      const docAnswer = searchDocumentContent(userText, documentContent);

      // 2️⃣ Also try the structured knowledge base (for form triggering)
      const match = findMatchingKnowledge(userText, isLoggedIn);

      if (match) {
        aiReplyText = docAnswer
          ? `${match.reply}\n\n📄 From Barangay Document:\n${docAnswer}`
          : match.reply;

        if (match.canTriggerForm) {
          formType = match.topic.formType;
          formTitle = match.topic.title;
        } else if (!isLoggedIn && match.topic.formType) {
          guestActionTrigger = true;
        }
      } else if (docAnswer) {
        // Document answered it even if not in structured knowledge
        aiReplyText = `📄 Based on Barangay documents:\n\n${docAnswer}`;
        // Guests asking about applications — suggest login
        if (
          !isLoggedIn &&
          /apply|request|form|submit|certificate|clearance|permit/i.test(userText)
        ) {
          guestActionTrigger = true;
        }
      } else {
        aiReplyText =
          "I'm here to help! You can ask me about:\n• Barangay Clearances\n• Certificate of Indigency or Residency\n• Business Clearance\n• Ordinances & curfew policies\n• Office hours and events\n\nTry asking in Filipino or English!";
      }

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: aiReplyText,
        formType,
        formTitle,
        guestActionTrigger,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Save AI response to DB (RLS-protected per user)
      if (isLoggedIn) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("chat_messages").insert({
            user_id: user.id,
            sender: "ai",
            message: aiReplyText,
            form_type: formType || null,
          });
        }
      }

      setLoading(false);
    }, 650);
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-white overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Smart Barangay AI</h1>
            <p className="text-[10px] text-blue-100 font-medium flex items-center gap-1">
              {isLoggedIn ? (
                <>🔒 Resident Mode · RLS Active</>
              ) : (
                <>
                  <Globe className="h-2.5 w-2.5" /> Guest Mode
                </>
              )}
              {docCount > 0 && (
                <span className="ml-1.5 text-green-300 flex items-center gap-0.5">
                  <FileText className="h-2.5 w-2.5" /> {docCount} doc{docCount > 1 ? "s" : ""} loaded
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Sign-in button for guests */}
        {!isLoggedIn && (
          <Link
            href="/login"
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 border border-white/30"
          >
            Sign In <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* ── Guest Info Banner ────────────────────────────────────────────── */}
      {!isLoggedIn && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-800 shrink-0">
          <Globe className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>
            <strong>Guest Mode</strong> — You can ask about policies. 
            <Link href="/login" className="ml-1 text-blue-700 font-semibold underline">
              Sign in
            </Link>{" "}
            to request documents &amp; track applications.
          </span>
        </div>
      )}

      {/* ── Messages Stream ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gray-50/40">
        {messages.map((m) => {
          const isUser = m.sender === "user";
          return (
            <div key={m.id} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="h-7 w-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
              )}
              <div className="max-w-[85%] space-y-2">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isUser
                      ? "bg-blue-600 text-white rounded-br-none font-medium"
                      : "bg-white text-gray-800 rounded-bl-none border border-gray-200"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>

                {/* Interactive in-chat form for logged-in residents */}
                {m.formType && m.formTitle && (
                  <InChatFormCard formType={m.formType} title={m.formTitle} />
                )}

                {/* Guest action prompt */}
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

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-2.5 items-center text-xs text-gray-400 font-medium">
            <div className="h-7 w-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center animate-pulse">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <span className="animate-pulse">AI is reading documents…</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Bar ───────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t bg-white flex items-center gap-2 shrink-0 shadow-[0_-1px_6px_rgba(0,0,0,0.06)]"
      >
        <input
          type="text"
          placeholder={
            isLoggedIn
              ? "Ask AI or request a document..."
              : "Ask about policies, clearance, ordinances..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="h-10 w-10 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center transition-all shadow disabled:opacity-40 shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

      {/* Guest Auth Modal */}
      <GuestAuthModal isOpen={showGuestModal} onClose={() => setShowGuestModal(false)} />
    </div>
  );
}
