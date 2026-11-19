"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  User, Send, Lock, ArrowRight, RotateCcw,
  FileText, Globe, AlertCircle, Clock, Volume2, VolumeX, Loader2, Mic, MicOff, Check,
  ChevronRight, History,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InChatFormCard } from "./InChatFormCard";
import { ServiceDirectory } from "./ServiceDirectory";
import { ChatHistoryPanel, type ResidentChatSession } from "./ChatHistoryPanel";
import { GuestAuthModal } from "@/components/guest/GuestAuthModal";
import { useTTS, TTSLanguage } from "@/hooks/useTTS";
import { useSTT } from "@/hooks/useSTT";
import { useSoraVoiceConversation } from "@/hooks/useSoraVoiceConversation";
import { SoraRealtimeControls } from "./SoraRealtimeControls";
import { DOCUMENT_FORMS, isDocumentFormId, requestedDocumentForm } from "@/lib/ai/document-forms";
import { getVerifiedQuestionSuggestions } from "@/lib/ai/policy-knowledge";
import { matchServiceFaq } from "@/lib/ai/verified-service-faq";
import { getGuestGuideReply } from "@/lib/ai/sora-guest-guide";
import { buildOfflineServiceReply, type OfflineDocument, type OfflineDocumentSnapshot } from "@/lib/ai/sora-offline-service-guide";
import { loadPublicSnapshot, savePublicSnapshot } from "@/lib/offline/public-snapshots";
import { getAIGreeting, AI_NAME } from "../../lib/ai/config";
import Link from "next/link";

const SORA_AVATAR = "/ate-sora.jpg";
const VOICE_GREETING: Record<TTSLanguage, string> = {
  tgl: "Kumusta! Ako si Ate Sora. Pindutin ang Fast Talk para mabilis akong sumagot, o Record instead kung kailangan.",
  ceb: "Maayong adlaw! Ako si Ate Sora. I-tap ang Fast Talk para dali akong makatubag, o Record instead.",
  en: "Hello! I'm Ate Sora. Choose Fast Talk for a quicker spoken reply, or Record instead.",
};

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
  isReceipt?: boolean;
  isOfflineGuide?: boolean;
  isGuestGuide?: boolean;
  guestSignInRequired?: boolean;
  timestamp?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectFormTrigger(text: string, isLoggedIn: boolean): { formType?: string; formTitle?: string; guestActionTrigger?: boolean } {
  const id = requestedDocumentForm(text) ?? matchServiceFaq(text)?.id ?? null;
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
    tgl: `${getAIGreeting('tagalog')}\n\nMaaari mong itanong ang:\n• Mga kailangan sa Barangay Clearance\n• Mga ordinansa at patakaran\n• Certificate of Indigency\n• Oras ng opisina\n• Mga aktibidad ng barangay\n\nSinusuri ko ang available na rekord. Hindi ako magbibigay ng hindi kumpirmadong bayad o iskedyul.`,
    ceb: `${getAIGreeting('cebuano')}\n\nMahimo kang mangutana bahin sa:\n• Mga kinahanglanon sa Barangay Clearance\n• Mga ordinansa ug polisiya\n• Certificate of Indigency\n• Oras sa opisina\n• Mga kalihokan sa barangay\n\nGisusi nako ang available nga mga rekord. Dili ko manghimo og wala makumpirmang bayad o iskedyul.`,
    en: `${getAIGreeting('english')}\n\nYou can ask about:\n• Barangay Clearance requirements\n• Ordinances and policies\n• Certificate of Indigency\n• Office hours\n• Community events\n\nI check available records and will flag unverified fees or schedules.`,
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", sender: "ai", text: welcomeByLanguage["tgl"], timestamp: Date.now() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [cachedAuthUnverified, setCachedAuthUnverified] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineCatalogCount, setOfflineCatalogCount] = useState<number | null>(null);
  const startupRequestHandledRef = useRef(false);
  const [userInitials, setUserInitials] = useState<string>("");
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => uuidv4());
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [savedSessions, setSavedSessions] = useState<ResidentChatSession[]>([]);
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyHydrated, setHistoryHydrated] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [rememberPreviousChats, setRememberPreviousChats] = useState(false);
  const [memoryBusy, setMemoryBusy] = useState(false);
  const historyLoadVersionRef = useRef(0);
  const [ttsLang, setTtsLang] = useState<TTSLanguage>("tgl");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [serviceDirectoryOpen, setServiceDirectoryOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [realtimeSpeaking, setRealtimeSpeaking] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const voiceTranscriptRef = useRef<string | null>(null);
  const voiceRequestInFlightRef = useRef(false);
  const lastVoiceReplyRef = useRef<string | null>(null);
  const voiceIntroLanguageRef = useRef<TTSLanguage | null>(null);
  const { speak, stop: stopSpeaking, speakingId, loadingId, playbackError, playbackNotice, retryLastSpeech } = useTTS();
  const { isListening, isSupported, startListening, toggleListening, stopListening } = useSTT();
  const soraVoice = useSoraVoiceConversation({
    language: ttsLang,
    onReply: (reply) => {
      const now = Date.now();
      const aiId = `ai-voice-${now}`;
      lastVoiceReplyRef.current = aiId;
      // Fast push-to-talk delivers the grounded text without waiting for TTS.
      // The shared player then prefers Ate Sora's natural provider voice.
      // Older backends may still include audio; never play two voices at once.
      if (!reply.audio?.audio_url && voiceModeRef.current) {
        speak(aiId, reply.answer, reply.language);
      }
      setMessages((prev) => [...prev,
        { id: `user-voice-${now}`, sender: "user", text: reply.transcript, timestamp: now },
        { id: aiId, sender: "ai", text: reply.answer, citations: reply.citations, timestamp: now + 1, ...detectFormTrigger(reply.transcript, isLoggedIn) },
      ]);
      if (isLoggedIn) void persistLocalExchange(reply.transcript, reply.answer,
        detectFormTrigger(reply.transcript, isLoggedIn).formType, reply.citations, sessionId);
    },
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  // Never animate the face while merely fetching or buffering speech.
  const soraIsSpeaking = Boolean(speakingId || (voiceMode && soraVoice.status === "speaking") || (voiceMode && realtimeSpeaking));
  const voiceModeRef = useRef(false);
  voiceModeRef.current = voiceMode;

  const verifiedSuggestions = getVerifiedQuestionSuggestions(ttsLang);
  const isWelcomeOnly = messages.length === 1 && messages[0].id === "welcome";

  useEffect(() => {
    const saved = window.localStorage.getItem("barangay-ai-language") as TTSLanguage | null;
    if (saved === "tgl" || saved === "ceb" || saved === "en") setTtsLang(saved);
    else setShowLanguagePicker(true);
  }, []);

  // The outer PWA shell uses a cached Supabase session offline. Match that
  // behavior here so a previously signed-in resident is not shown as Guest
  // merely because network verification cannot run. No remote permission or
  // submitted application is ever inferred from this cached identity.
  useEffect(() => {
    const updateDeviceStatus = () => {
      const connected = navigator.onLine;
      setIsOnline(connected);
      if (!connected) setCachedAuthUnverified(true);
    };
    updateDeviceStatus();
    window.addEventListener("online", updateDeviceStatus);
    window.addEventListener("offline", updateDeviceStatus);
    return () => {
      window.removeEventListener("online", updateDeviceStatus);
      window.removeEventListener("offline", updateDeviceStatus);
    };
  }, []);

  useEffect(() => {
    let active = true;
    function applyUser(user: { id: string; user_metadata?: Record<string, any>; email?: string } | null, unverified: boolean) {
      if (!active) return;
      setIsLoggedIn(!!user);
      setAuthUserId(user?.id ?? null);
      setCachedAuthUnverified(!!user && unverified);
      if (!user) { setUserInitials(""); return; }
      const rawName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "";
      const initials = rawName
        .split(/[\s._-]+/)
        .map((word: string) => word[0] || "")
        .join("")
        .toUpperCase()
        .slice(0, 2);
      setUserInitials(initials || "U");
    }
    async function checkAuth() {
      try {
        // getSession can use the locally cached session. getUser is the only
        // server verification and is required again when connectivity returns.
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        applyUser(session?.user ?? null, true);
        if (navigator.onLine) {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (!active) return;
          if (!error) applyUser(user, false);
        }
      } catch {
        // Keep the last known state until connectivity returns; the server
        // will authorize every protected operation regardless of this UI.
      } finally {
        if (active) setAuthChecked(true);
      }
    }
    void checkAuth();
    window.addEventListener("online", checkAuth);
    return () => {
      active = false;
      window.removeEventListener("online", checkAuth);
    };
  }, [supabase]);

  // Public app document names/descriptions only; never cache resident chats,
  // required IDs, private fields, eligibility or application submissions.
  useEffect(() => {
    let active = true;
    void loadPublicSnapshot<OfflineDocument[]>("document-types")
      .then(snapshot => {
        if (active && snapshot && Array.isArray(snapshot.data))
          setOfflineCatalogCount(snapshot.data.length);
      }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authChecked || !authUserId || !isLoggedIn || cachedAuthUnverified || !isOnline) return;
    let active = true;
    async function refreshGuide() {
      try {
        const { data, error } = await supabase.from("document_types")
          .select("id,name,description").order("name").limit(100);
        if (error || !Array.isArray(data) || !data.length || !active) return;
        const safe = data.filter(row => row && typeof row.id === "string" &&
          typeof row.name === "string" && row.name.trim().length > 0).map(row => ({
            id: row.id,
            name: row.name.trim().slice(0, 120),
            description: typeof row.description === "string" ? row.description.slice(0, 380) : null,
          }));
        if (!safe.length || !active) return;
        await savePublicSnapshot("document-types", safe, 24 * 60 * 60 * 1000);
        if (active) setOfflineCatalogCount(safe.length);
      } catch {
        // Retain the existing public snapshot if the network fails.
      }
    }
    void refreshGuide();
    return () => { active = false; };
  }, [authChecked, authUserId, isLoggedIn, cachedAuthUnverified, isOnline, supabase]);

  function memoryKey(userId: string) {
    return "ate-sora-current-session:" + userId;
  }

  function fromSavedRows(rows: Array<{
    id: string; sender: "user" | "ai"; message: string;
    citations?: unknown; created_at?: string | null; form_type?: string | null;
  }>): Message[] {
    const restored = rows.filter(row =>
      (row.sender === "ai" || row.sender === "user") && typeof row.message === "string"
    ).map(row => ({
      id: row.id,
      sender: row.sender,
      text: row.message,
      citations: Array.isArray(row.citations)
        ? row.citations.filter((item): item is string => typeof item === "string") : [],
      timestamp: row.created_at ? Date.parse(row.created_at) : Date.now(),
      // Previous form cards are deliberately NOT resubmitted or re-opened from
      // historical messages; residents may open a new form when ready.
    }));
    return restored.length ? restored : [{
      id: "welcome", sender: "ai" as const,
      text: welcomeByLanguage[ttsLang], timestamp: Date.now(),
    }];
  }

  const fetchSavedSessions = useCallback(async (uid: string) => {
    const { data, error } = await supabase.from("chat_sessions")
      .select("id,session_token,title,started_at,last_active_at")
      .eq("user_id", uid)
      .order("last_active_at", { ascending: false }).limit(100);
    if (error) throw new Error("Unable to load saved conversations: " + error.message);
    return (data ?? []) as ResidentChatSession[];
  }, [supabase]);

  // Recover the previous conversation when re-opening the PWA or navigating
  // back from a document. Never erase it just because the component remounted.
  useEffect(() => {
    if (!authChecked) return;
    if (!isLoggedIn) {
      setHistoryLoading(false);
      setHistoryHydrated(true);
      return;
    }
    if (!authUserId) return;
    if (!isOnline) {
      // Cloud history has not been copied to this device. Never show an empty
      // result as proof that a resident's saved conversations were deleted.
      setHistoryError("Saved chat history needs an internet connection. Your earlier chats are still stored online; reconnect to open them.");
      setHistoryLoading(false);
      setHistoryHydrated(true);
      return;
    }
    setHistoryError("");
    const version = ++historyLoadVersionRef.current;
    let cancelled = false;
    async function hydrate() {
      setHistoryLoading(true);
      try {
        const [allSessions, preference] = await Promise.all([
          fetchSavedSessions(authUserId!),
          supabase.from("sora_chat_memory_preferences")
            .select("remember_previous_chats").eq("user_id", authUserId!).maybeSingle(),
        ]);
        if (cancelled || historyLoadVersionRef.current !== version) return;
        setSavedSessions(allSessions);
        if (!preference.error)
          setRememberPreviousChats(preference.data?.remember_previous_chats === true);

        const storedToken = window.localStorage.getItem(memoryKey(authUserId!));
        const target = allSessions.find(entry => entry.session_token === storedToken) ?? allSessions[0];
        if (!target) return;
        const { data: rows, error: messagesError } = await supabase.from("chat_messages")
          .select("id,sender,message,citations,created_at,form_type")
          .eq("user_id", authUserId!).eq("session_id", target.id)
          .order("created_at", { ascending: true }).limit(500);
        if (messagesError) throw new Error("Unable to load saved messages: " + messagesError.message);
        if (cancelled || historyLoadVersionRef.current !== version) return;
        setSessionId(target.session_token);
        setMessages(fromSavedRows(rows ?? []));
        window.localStorage.setItem(memoryKey(authUserId!), target.session_token);
      } catch (error) {
        if (!cancelled) setHistoryError(error instanceof Error ? error.message : "Unable to restore chat history.");
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
          setHistoryHydrated(true);
        }
      }
    }
    void hydrate();
    return () => { cancelled = true; };
  }, [authChecked, isLoggedIn, authUserId, isOnline, fetchSavedSessions, supabase]);

  async function openChatHistory() {
    if (!authUserId || !isLoggedIn) return;
    setChatHistoryOpen(true);
    if (!isOnline) {
      setHistoryError("Previous chats are stored online, not deleted. Reconnect to load them.");
      setHistoryLoading(false);
      return;
    }
    setHistoryError("");
    setHistoryLoading(true);
    try {
      setSavedSessions(await fetchSavedSessions(authUserId));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Unable to refresh history.");
    } finally { setHistoryLoading(false); }
  }

  async function switchToSavedSession(saved: ResidentChatSession) {
    if (!authUserId || loading || historyBusy) return;
    setHistoryBusy(true);
    setHistoryError("");
    const version = ++historyLoadVersionRef.current;
    try {
      const { data: owned, error: sessionError } = await supabase.from("chat_sessions")
        .select("id,session_token").eq("id", saved.id).eq("user_id", authUserId)
        .eq("session_token", saved.session_token).maybeSingle();
      if (sessionError || !owned) throw new Error("This chat isn't available in your account.");
      const { data: rows, error: rowsError } = await supabase.from("chat_messages")
        .select("id,sender,message,citations,created_at,form_type")
        .eq("user_id", authUserId).eq("session_id", owned.id)
        .order("created_at", { ascending: true }).limit(500);
      if (rowsError) throw new Error("Unable to read this conversation.");
      if (version !== historyLoadVersionRef.current) return;
      stopSpeaking();
      setSessionId(owned.session_token);
      setMessages(fromSavedRows(rows ?? []));
      setInput("");
      setChatHistoryOpen(false);
      window.localStorage.setItem(memoryKey(authUserId), owned.session_token);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not reopen this chat.");
    } finally { setHistoryBusy(false); }
  }

  async function toggleRememberPreviousChats(enabled: boolean) {
    if (!authUserId) return;
    setMemoryBusy(true);
    setHistoryError("");
    try {
      const { error } = await supabase.from("sora_chat_memory_preferences")
        .upsert({ user_id: authUserId, remember_previous_chats: enabled,
          updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) throw error;
      setRememberPreviousChats(enabled);
    } catch {
      setHistoryError("Could not update memory setting. Your previous choice is unchanged.");
    } finally { setMemoryBusy(false); }
  }

  // Persist direct form messages, voice replies and submission receipts in the
  // same authenticated, RLS-protected chat schema as typed AI messages.
  async function persistLocalMessage(
    sender: "user" | "ai", text: string, token: string,
    extra: { formType?: string; citations?: string[] } = {}
  ) {
    if (!authUserId || !text.trim()) return;
    try {
      const { data: session, error: sessionError } = await supabase.from("chat_sessions")
        .upsert({ user_id: authUserId, session_token: token,
          last_active_at: new Date().toISOString() }, { onConflict: "session_token" })
        .select("id").single();
      if (sessionError || !session?.id) throw new Error("Chat session could not be saved.");
      const { error } = await supabase.from("chat_messages").insert({
        user_id: authUserId, sender, message: text, session_id: session.id,
        ...(extra.formType ? { form_type: extra.formType } : {}),
        ...(extra.citations ? { citations: extra.citations } : {}),
      });
      if (error) throw error;
    } catch (error) {
      console.warn("Unable to save a local chat turn:", error);
      setHistoryError("Some chat messages could not be saved. Check your connection.");
    }
  }

  async function persistLocalExchange(question: string, answer: string,
    formType?: string, citations?: string[], token = sessionId) {
    await persistLocalMessage("user", question, token);
    await persistLocalMessage("ai", answer, token, { formType, citations });
  }

  useEffect(() => {
    setMessages((current) =>
      current.map((message) =>
        message.id === "welcome" ? { ...message, text: welcomeByLanguage[ttsLang] } : message
      )
    );
  }, [ttsLang]);

  // Home shortcuts and My Requests open the document selector *inside* Ate Sora.
  // Resolve sign-in before opening the form so logged-in residents are not
  // accidentally given the guest-only prompt after client navigation.
  useEffect(() => {
    if (!authChecked || !historyHydrated || historyLoading || (isLoggedIn && !authUserId) || startupRequestHandledRef.current) return;
    startupRequestHandledRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const document = params.get("document");
    if (document && isDocumentFormId(document)) {
      const formTitle = DOCUMENT_FORMS[document].title;
      setMessages(prev => [...prev,
        { id: `quick-request-${uuidv4()}`, sender: "user", text: `Apply for ${formTitle}`, timestamp: Date.now() },
        isLoggedIn
          ? {
            id: `quick-form-${uuidv4()}`, sender: "ai",
            text: `Narito ang ${formTitle} form. Piliin ang ID o proof na nasa verified profile mo kung available. Walang naipapasang request hangga't hindi mo pinipindot ang Submit.`,
            formType: document, formTitle, timestamp: Date.now(),
          }
          : {
            id: `quick-guest-${uuidv4()}`, sender: "ai",
            text: "Sign in to your resident account before completing and submitting the application.",
            guestActionTrigger: true, timestamp: Date.now(),
          },
      ]);
      if (isLoggedIn) {
        const requestText = `Apply for ${formTitle}`;
        const responseText = `Narito ang ${formTitle} form. Mula sa verified barangay catalog ang requirements. Walang request na naipapasa hangga't hindi mo pinipindot ang Submit.`;
        void persistLocalExchange(requestText, responseText, document, [], sessionId);
      }
    } else if (params.get("services") === "1") {
      setServiceDirectoryOpen(true);
    }
  }, [authChecked, isLoggedIn, authUserId, historyHydrated, historyLoading]);

  useEffect(() => {
    if (!voiceMode || loading) return;
    const latest = messages[messages.length - 1];
    if (latest?.sender === "ai" && latest.id !== "welcome" && !latest.isError && lastVoiceReplyRef.current !== latest.id) {
      lastVoiceReplyRef.current = latest.id;
      speak(latest.id, latest.text, ttsLang);
    }
  }, [voiceMode, loading, messages, speak, ttsLang]);

  // Only announce a changed language here. Initial voice greeting is invoked
  // directly from the user's tap so Safari may start speech with audio unlocked.
  useEffect(() => {
    if (!voiceMode || voiceIntroLanguageRef.current === ttsLang) return;
    voiceIntroLanguageRef.current = ttsLang;
    if (process.env.NEXT_PUBLIC_SORA_REALTIME_ENABLED !== "true") {
      speak("voice-intro", VOICE_GREETING[ttsLang], ttsLang);
    }
  }, [voiceMode, ttsLang, speak]);

  const selectLanguage = (language: TTSLanguage) => {
    setTtsLang(language);
    window.localStorage.setItem("barangay-ai-language", language);
    setShowLanguagePicker(false);
  };

  useEffect(() => {
    const viewport = messagesScrollRef.current;
    if (!viewport) return;
    const last = messages[messages.length - 1];
    if (last?.formType) {
      // A full application form can be much taller than the chat viewport.
      // Show its HEADER first, not the submit button or an apparently blank screen.
      const cards = viewport.querySelectorAll<HTMLElement>("[data-ate-sora-form-message]");
      const card = cards[cards.length - 1];
      if (card) {
        const top = card.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top + viewport.scrollTop;
        viewport.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
        return;
      }
    }
    // Scroll only the message viewport, never the outer PWA page and bottom nav.
    viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // A confirmed server receipt closes the inline form and restores normal chat.
  // The reference remains visible in the conversation for the resident to track.
  function handleFormSubmitted(messageId: string, reference: string) {
    const receiptText = ttsLang === "ceb"
      ? `Na-submit na ang imong dokumento sa barangay para sa review. Reference: ${reference}. Makita nimo kini sa My Requests. Wala pa'y nakumpirmang bayad o petsa sa pagkuha. Unsa pa akong ikatabang?`
      : ttsLang === "en"
        ? `Your document request was submitted to the barangay for review. Reference: ${reference}. Track it in My Requests. No fee or pickup date is confirmed yet. What else can I help you with?`
        : `Na-submit na ang iyong document request sa barangay para sa review. Reference: ${reference}. Tingnan ang status sa My Requests. Wala pang kumpirmadong bayad o pickup date. Ano pa ang maitutulong ko?`;
    if (isLoggedIn) void persistLocalMessage("ai", receiptText, sessionId);
    setMessages(previous => {
      if (!previous.some(message => message.id === messageId && message.formType)) return previous;
      return [
        ...previous.map(message => message.id === messageId
          ? { ...message, formType: undefined, formTitle: undefined, formSchema: undefined }
          : message),
        {
          id: `ai-receipt-${uuidv4()}`,
          sender: "ai",
          text: receiptText,
          isReceipt: true,
          timestamp: Date.now(),
        },
      ];
    });
  }

  function resetChat() {
    // "New conversation" creates a NEW session; it never deletes the old one.
    ++historyLoadVersionRef.current;
    setSessionId(uuidv4());
    if (authUserId) window.localStorage.removeItem(memoryKey(authUserId));
    setChatHistoryOpen(false);
    setMessages([{ id: "welcome", sender: "ai", text: welcomeByLanguage[ttsLang], timestamp: Date.now() }]);
    setInput("");
    voiceTranscriptRef.current = null;
    setRateLimited(false);
  }

  const handleSend = useCallback(async (e: React.FormEvent, overrideText?: string) => {
    e.preventDefault();
    const text = overrideText ?? voiceTranscriptRef.current ?? input;
    voiceTranscriptRef.current = null;
    if (!text.trim() || !authChecked || loading || historyLoading || historyBusy) { voiceRequestInFlightRef.current = false; return; }

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

    // Local-only, read-only service answers while the device reports offline.
    // No LLM, browser API, chat-history write or document submission occurs.
    // Requests outside the offline FAQ still take the existing API path.
    if (!isOnline) {
      let savedCatalog: OfflineDocumentSnapshot = null;
      try {
        savedCatalog = await loadPublicSnapshot<OfflineDocument[]>("document-types");
      } catch {
        // Navigation-only guidance also works without IndexedDB.
      }
      const guide = buildOfflineServiceReply(userText, ttsLang, savedCatalog);
      if (guide) {
        setMessages(previous => [...previous, {
          id: "ai-offline-guide-" + uuidv4(),
          sender: "ai",
          text: guide.answer,
          isOfflineGuide: true,
          timestamp: Date.now(),
        }]);
        voiceRequestInFlightRef.current = false;
        return;
      }
    }

    // A resident explicitly requesting a known form should not need an AI call,
    // a chat quota, or a functioning LLM backend before the actual form appears.
    // InChatFormCard fetches the authoritative document catalog and performs
    // server-side authenticated submission; no AI-provided requirements are trusted.
    if (userFormRequest.formType && isDocumentFormId(userFormRequest.formType)) {
      const formTitle = DOCUMENT_FORMS[userFormRequest.formType].title;
      const formReplyText = ttsLang === "ceb"
        ? `Ani ang aplikasyon para sa ${formTitle}. Ang mga rekisitos kuhaon gikan sa tinuod nga barangay service catalog. Wala pay napasa nga request.`
        : ttsLang === "en"
          ? `Here is your ${formTitle} application. Requirements are loaded from the barangay service catalog. Nothing is submitted until you confirm the form.`
          : `Narito ang ${formTitle} application. Mula sa barangay service catalog ang requirements. Wala pang request na nasusumite hangga't hindi mo kinukumpirma ang form.`;
      setMessages((prev) => [...prev, {
        id: `ai-form-${uuidv4()}`,
        sender: "ai", text: formReplyText,
        formType: userFormRequest.formType, formTitle,
        timestamp: Date.now(),
      }]);
      if (isLoggedIn) void persistLocalExchange(userText, formReplyText, userFormRequest.formType, [], sessionId);
      voiceRequestInFlightRef.current = false;
      return;
    }
    if (userFormRequest.guestActionTrigger) {
      setMessages((prev) => [...prev, {
        id: `ai-guest-${uuidv4()}`,
        sender: "ai",
        text: "Please sign in with your resident account to access the current application form and submit a document request.",
        guestActionTrigger: true,
        timestamp: Date.now(),
      }]);
      voiceRequestInFlightRef.current = false;
      return;
    }
    // Guests can use read-only public navigation, but the server AI endpoint is
    // authenticated and globally rate-limited. Do not send anonymous requests
    // that will return 401 or bypass backend permissions/quotas.
    if (!isLoggedIn) {
      const guestGuide = getGuestGuideReply(userText, ttsLang);
      setMessages(previous => [...previous, {
        id: "ai-guest-guide-" + uuidv4(),
        sender: "ai",
        text: guestGuide.text,
        isGuestGuide: true,
        guestSignInRequired: guestGuide.needsSignIn,
        timestamp: Date.now(),
      }]);
      voiceRequestInFlightRef.current = false;
      return;
    }
    setLoading(true);

    // navigator.onLine is only a device hint, not proof that the AI API is unreachable.
    // Attempt the real request and classify any failure from the response/error.

    let persistedSessionId: string | null = null;
    if (isLoggedIn) {
      try {
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
      } catch (saveError) {
        // Session history is best-effort: network or storage errors must not
        // prevent an actual AI answer or the resident's in-chat form.
        console.warn("Unable to save chat history:", saveError);
      }
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
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

      if (res.status === 401) {
        // A signed-in UI can still hold an expired/stale session. The API is
        // authoritative: offer reauthentication; never silently reroute this
        // request as an anonymous AI call or erase saved conversations.
        setCachedAuthUnverified(true);
        setMessages(prev => [...prev, {
          id: "ai-auth-required-" + uuidv4(),
          sender: "ai",
          text: ttsLang === "ceb"
            ? "Kinahanglan ka mo-sign in pag-usab. Wala madawat sa server ang imong pangutana; wala kini na-submit. Ang daan nga saved chats wala gi-delete."
            : ttsLang === "en"
              ? "Please sign in again. The server could not authenticate this question; it was not submitted. Your previous saved chats have not been deleted."
              : "Kailangan mong mag-sign in muli. Hindi na-authenticate ng server ang tanong na ito at hindi ito na-submit. Hindi nabura ang dati mong saved chats.",
          isError: true,
          guestSignInRequired: true,
          timestamp: Date.now(),
        }]);
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
            model_used: typeof data.model_used === "string" ? data.model_used : "unreported",
            session_id: persistedSessionId,
          });
          await supabase.from("chat_sessions").update({
            last_active_at: new Date().toISOString(),
          }).eq("session_token", sessionId).eq("user_id", user.id);
        }
      }
    } catch (err: any) {
      const networkFailed = err instanceof TypeError;
      const likelyOffline = networkFailed && !navigator.onLine;
      setMessages((prev) => [...prev, {
        id: `ai-err-${Date.now()}`,
        sender: "ai",
        text: likelyOffline
          ? "Hindi maabot ang Ate Sora server. Kailangan ng internet para sa live AI chat at service catalog. Huwag ituring na submitted o saved ang tanong o application hangga't walang server confirmation. Subukan muli kapag connected."
          : networkFailed
            ? "Hindi maabot ang Ate Sora service sa ngayon kahit may internet connection ka. Subukang muli; maaari mo pa ring punan ang form sa chat kung available ang document catalog."
            : err?.message || "Pansamantalang hindi available ang Ate Sora service. Subukang muli.",
        isError: !userFormRequest.formType,
        timestamp: Date.now(),
        // If the AI endpoint fails, an explicitly requested document can still
        // display the inline form. The form independently verifies the catalog.
        formType: userFormRequest.formType,
        formTitle: userFormRequest.formTitle,
        guestActionTrigger: userFormRequest.guestActionTrigger,
      }]);
    } finally {
      voiceRequestInFlightRef.current = false;
      setLoading(false);
    }
  }, [input, authChecked, loading, historyLoading, historyBusy, isLoggedIn, isOnline, sessionId, supabase, ttsLang]);

  const handleSuggestion = (query: string) => {
    const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
    handleSend(syntheticEvent, query);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative mx-auto flex h-full min-h-0 max-w-lg w-full flex-col overflow-hidden bg-white">

      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src={SORA_AVATAR} alt="Ate Sora" className="h-9 w-9 rounded-full object-cover object-top shrink-0 ring-2 ring-blue-100" />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-gray-900 leading-tight">{AI_NAME}</h1>
            <p className="text-[10px] font-medium flex items-center gap-1 mt-0.5">
              {isLoggedIn ? (
                <><span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-0.5" /><span className="text-green-600">{cachedAuthUnverified ? "Cached resident session · not yet verified" : "Resident Mode"}</span></>
              ) : (
                <><span className="inline-block h-1.5 w-1.5 rounded-full bg-gray-300 mr-0.5" /><span className="text-gray-400">Guest Mode</span></>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isLoggedIn && (
            <button type="button" onClick={() => void openChatHistory()}
              title="Chat history" aria-label="Chat history"
              disabled={loading || historyBusy}
              className="h-8 w-8 rounded-full bg-gray-50 border border-gray-200 text-blue-700 hover:bg-blue-50 flex items-center justify-center disabled:opacity-50">
              <History className="h-4 w-4" />
            </button>
          )}
          {/* New chat button — only visible during a conversation */}
          {!isWelcomeOnly && (
            <button
              type="button"
              onClick={resetChat}
              disabled={loading || historyBusy || historyLoading}
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
              if (voiceMode) {
                soraVoice.cancel(); stopListening(); stopSpeaking();
                setRealtimeSpeaking(false);
                voiceIntroLanguageRef.current = null;
                setVoiceMode(false);
              } else {
                setVoiceMode(true);
                voiceIntroLanguageRef.current = ttsLang;
                if (process.env.NEXT_PUBLIC_SORA_REALTIME_ENABLED !== "true") {
                  speak("voice-intro", VOICE_GREETING[ttsLang], ttsLang);
                }
              }
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

      {!isOnline && (
        <div role="status" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-950 shrink-0">
          Ate Sora needs internet for AI answers and previous chats. Offline Quick Guide can answer common service questions{offlineCatalogCount ? " using " + offlineCatalogCount + " saved catalog entries" : " with basic navigation help"}. Requirements, fees, and actual applications still need online verification. No offline chat is automatically submitted.
          {" "}<Link href="/~offline" className="font-semibold underline underline-offset-2">View offline help</Link>
        </div>
      )}

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
      <div ref={messagesScrollRef} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white no-scrollbar">
        <div className="p-4 space-y-4">

          {/* Welcome hero — shown only before first user message */}
          {isWelcomeOnly && (
            <div className="flex flex-col items-center text-center pt-6 pb-2">
              <div className="mb-4">
                <h2 className="text-base font-bold text-gray-900">{AI_NAME}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Barangay Service Assistant</p>
              </div>
              <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed mb-6">
                {ttsLang === "tgl"
                  ? "Pumili ng tanong tungkol sa serbisyo. Ang opisyal na bayad at requirements ay kailangang makumpirma."
                  : ttsLang === "ceb"
                  ? "Pilia ang pangutana bahin sa serbisyo. Kinahanglan makumpirma ang opisyal nga bayad ug mga rekisitos."
                  : "Choose a service question below. Official fees and requirements still need verification."}
              </p>

              {/* Topic list */}
              <div className="w-full max-w-sm space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
                  Common service questions
                </p>
                {verifiedSuggestions.map((s) => (
                  <button
                    key={s.topicId}
                    type="button"
                    onClick={() => handleSuggestion(s.query)}
                    className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{s.label}</span>
                      <span className="mt-1 block text-xs text-slate-600">{s.query}</span>
                    </span>
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </button>
                ))}
                <button type="button" onClick={() => setServiceDirectoryOpen(true)}
                  className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-800 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600">
                  View all barangay services <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((m) => {
            const isUser = m.sender === "user";
            if (m.id === "welcome" && isWelcomeOnly) return null;
            return (
              <div key={m.id} data-ate-sora-form-message={m.formType ? "true" : undefined} className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
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

                <div className={`${m.formType ? "w-full min-w-0 max-w-[calc(100%-2.5rem)]" : "max-w-[85%]"} flex flex-col space-y-1.5 ${isUser ? "items-end" : "items-start"}`}>
                  {/* Bubble */}
                  <div role={m.isReceipt ? "status" : undefined} className={`px-4 py-3 text-xs leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white rounded-2xl rounded-br-sm font-medium shadow-2xs"
                      : m.isError
                      ? "bg-gray-50 text-gray-600 rounded-2xl rounded-bl-sm border border-gray-200"
                      : "bg-gray-50 text-gray-800 rounded-2xl rounded-bl-sm border border-gray-100"
                  }`}>
                    {m.isOfflineGuide && <span className="mb-1.5 block text-[10px] font-semibold text-amber-700">Offline Quick Guide · not submitted</span>}
                    {m.isGuestGuide && <span className="mb-1.5 block text-[10px] font-semibold text-blue-700">Guest Quick Guide · no AI request sent</span>}
                    <p className="whitespace-pre-line break-words [overflow-wrap:anywhere]">{m.text}</p>
                    {m.isReceipt && <Link href="/requests" className="mt-2 inline-flex min-h-11 items-center font-bold text-blue-700 underline">View My Requests</Link>}
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
                      {m.citations.slice(0, 4).map((cid) => {
                        const candidate = cid.match(/https:\/\/[^\s;]+/i)?.[0];
                        // Only known Philippine government domains may become
                        // external links. Other references stay plain text.
                        const officialUrl = candidate && /^https:\/\/(?:[a-z0-9-]+\.)*gov\.ph(?:\/|$)/i.test(candidate)
                          ? candidate : null;
                        const label = cid.split(";")[0].replace(/;?\s*Official source:.*/i, "").slice(0, 110);
                        return officialUrl ? (
                          <a key={cid} href={officialUrl} target="_blank" rel="noopener noreferrer"
                            className="max-w-full break-words rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 underline hover:bg-blue-100">
                            <FileText className="mr-1 inline h-3 w-3" aria-hidden="true" />{label} · Official source
                          </a>
                        ) : (
                          <span key={cid} className="max-w-full break-words rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-medium text-gray-600">
                            <FileText className="mr-1 inline h-3 w-3" aria-hidden="true" />{label}
                          </span>
                        );
                      })}
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
                      <InChatFormCard formType={m.formType} title={m.formTitle} sessionId={sessionId} formSchema={m.formSchema}
                         onSubmitted={reference => handleFormSubmitted(m.id, reference)} />
                    </div>
                  )}

                  {m.guestSignInRequired && (
                    <Link href="/login"
                      className="mt-1 inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                      <Lock className="h-3.5 w-3.5" /> Sign in for live AI chat
                    </Link>
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

      {/* Speaking avatar: no false talking animation while TTS is loading.
          Text-to-speech is audible; this is an expressive animation, not
          frame-accurate facial/lip synthesis. Keep chat controls accessible. */}
      {soraIsSpeaking && (
        <div role="status" aria-label="Ate Sora is speaking" className="pointer-events-none absolute left-1/2 top-14 z-40 -translate-x-1/2 rounded-3xl border border-blue-100 bg-white/95 px-5 py-4 text-center shadow-xl backdrop-blur-sm">
          <div className="relative mx-auto h-36 w-36">
            <span className="absolute -inset-2 animate-pulse rounded-full border-2 border-blue-200" aria-hidden="true" />
            <div className="relative h-full w-full overflow-hidden rounded-full bg-blue-50 ring-4 ring-white">
              <img src={SORA_AVATAR} alt="" className="h-full w-full object-cover object-top" />
              <span aria-hidden="true" className="sora-speaking-mouth absolute left-1/2 top-[63%] h-1.5 w-5 -translate-x-1/2 rounded-full bg-[#873448]/85 shadow-sm" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-900">
            <span className="sora-speaking-bar h-3 w-1 rounded-full bg-blue-600" />
            <span className="sora-speaking-bar h-5 w-1 rounded-full bg-blue-500 [animation-delay:120ms]" />
            <span className="sora-speaking-bar h-3 w-1 rounded-full bg-blue-600 [animation-delay:240ms]" />
            <span className="ml-1 whitespace-nowrap">Ate Sora is speaking</span>
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
                className="min-h-9 shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                {s.label}
              </button>
            ))}
            <button type="button" onClick={() => setServiceDirectoryOpen(true)}
              className="min-h-9 shrink-0 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
              All services
            </button>
          </div>
          {/* Fade-out gradient on the right */}
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Optional real-time voice mode */}
      {voiceMode && process.env.NEXT_PUBLIC_SORA_REALTIME_ENABLED === "true" && (
        <SoraRealtimeControls language={ttsLang} sessionId={sessionId}
          onUserTranscript={(transcript) => setMessages((prev) => [...prev, { id: "user-live-" + Date.now(), sender: "user", text: transcript, timestamp: Date.now() }])}
          onAssistantMessage={(answer) => setMessages((prev) => [...prev, { id: "ai-live-" + Date.now(), sender: "ai", text: answer, timestamp: Date.now() }])}
          onSpeakingChange={setRealtimeSpeaking}
          onEnd={() => { setRealtimeSpeaking(false); setVoiceMode(false); }} />
      )}

      {/* Voice mode status bar */}
      {voiceMode && process.env.NEXT_PUBLIC_SORA_REALTIME_ENABLED !== "true" && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-blue-100 bg-blue-50 px-3 py-2.5 min-[375px]:px-4">
          <div className="min-w-[130px] flex-1">
            <p className="text-xs font-bold text-blue-800">Voice Mode Active</p>
            <p className="mt-0.5 text-[10px] text-blue-600">
              {soraVoice.status === "processing" ? "Understanding your question..." : `Tap to Talk in ${ttsLang === "tgl" ? "Tagalog" : ttsLang === "ceb" ? "Cebuano" : "English"}, then Stop & Ask.`}
            </p>
          </div>
          {isLoggedIn && isOnline && isSupported && (
            <button
              type="button"
              aria-label={isListening ? "Stop fast voice recognition" : "Fast talk with Ate Sora"}
              disabled={loading || soraVoice.status === "recording" || soraVoice.status === "processing"}
              onClick={() => {
                if (isListening) {
                  stopListening();
                } else {
                  stopSpeaking();
                  startListening(ttsLang, transcript => {
                    if (voiceRequestInFlightRef.current) return;
                    voiceRequestInFlightRef.current = true;
                    // Route through the same authenticated, grounded chat
                    // endpoint; no parallel speech-to-text upload needed.
                    void handleSend({ preventDefault() {} } as React.FormEvent, transcript);
                  });
                }
              }}
              className={`shrink-0 rounded-full px-3 py-2 text-[10px] font-bold text-white disabled:opacity-50 ${isListening ? "bg-red-600" : "bg-blue-600"}`}
            >
              {isListening ? "Stop listening" : "Fast Talk"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (soraVoice.status === "recording") {
                soraVoice.stopRecording();
              } else {
                // Prevent Ate Sora's introduction from being recorded as the
                // resident's microphone question, especially on loud phones.
                stopSpeaking();
                void soraVoice.startRecording();
              }
            }}
            disabled={soraVoice.status === "processing" || soraVoice.status === "speaking"}
            aria-label={soraVoice.status === "recording" ? "Stop recording and ask Ate Sora" : "Record question for Ate Sora"}
            className="shrink-0 rounded-full border border-blue-200 bg-white px-3 py-2 text-[10px] font-bold text-blue-700 disabled:opacity-50"
          >
            {soraVoice.status === "recording" ? "Stop & Ask" : soraVoice.status === "processing" ? "Thinking..." : soraVoice.status === "speaking" ? "Speaking..." : "Record instead"}
          </button>
          {isListening && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Listening
            </span>
          )}
          {soraVoice.error && <span role="alert" className="text-[10px] text-red-600">{soraVoice.error}</span>}
          {playbackNotice && (
            <p role="status" className="min-w-0 text-[10px] text-amber-800">{playbackNotice}</p>
          )}
          {playbackError && (
            <div role="alert" className="flex min-w-0 items-center gap-2 text-[10px] text-amber-700">
              <span>{playbackError}</span>
              <button type="button" className="shrink-0 rounded-lg border border-amber-300 bg-white px-2 py-1 font-bold"
                onClick={retryLastSpeech}>Hear natural voice</button>
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      <form
        ref={formRef}
        data-chat-composer="true"
        onSubmit={handleSend}
        className="flex shrink-0 items-center gap-2 border-t border-gray-100 bg-white px-3 py-3"
      >
        <div className={`flex min-h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border px-3 py-1 transition-all ${
          isListening
            ? "border-red-300 bg-red-50/40"
            : "border-gray-200 bg-gray-50 focus-within:border-blue-300 focus-within:bg-white"
        }`}>
          <input
            type="text"
            aria-label="Ask Ate Sora a question"
            placeholder={
              isListening
                ? `Listening in ${ttsLang === "ceb" ? "Cebuano" : ttsLang === "tgl" ? "Tagalog" : "English"}...`
                : isLoggedIn
                ? "Ask me anything about barangay services..."
                : "Ask about clearance, policies, office hours..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`min-w-0 w-full flex-1 bg-transparent text-base leading-6 outline-none text-gray-800 placeholder-gray-400 ${
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
              className={`flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full transition-all ${
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
            aria-label="Send message"
            disabled={!authChecked || !input.trim() || loading || historyLoading || historyBusy}
            className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-2xl bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-300"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        )}
      </form>

      {isLoggedIn && (
        <ChatHistoryPanel
          open={chatHistoryOpen}
          loading={historyLoading}
          busy={historyBusy || loading}
          sessions={savedSessions}
          activeToken={sessionId}
          rememberPreviousChats={rememberPreviousChats}
          memoryBusy={memoryBusy}
          error={historyError}
          onClose={() => setChatHistoryOpen(false)}
          onNew={resetChat}
          onSelect={saved => void switchToSavedSession(saved)}
          onToggleMemory={enabled => void toggleRememberPreviousChats(enabled)}
        />
      )}
      <ServiceDirectory open={serviceDirectoryOpen} onClose={() => setServiceDirectoryOpen(false)} onAsk={handleSuggestion} />
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
