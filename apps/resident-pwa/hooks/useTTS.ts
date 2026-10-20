"use client";

import { useState, useCallback, useRef } from "react";

export type TTSLanguage = "tgl" | "ceb" | "en";
type TTSState = "IDLE" | "LOADING" | "PLAYING" | "ERROR";
interface UseTTSReturn {
  speak: (messageId: string, text: string, language?: TTSLanguage) => void;
  stop: () => void;
  speakingId: string | null;
  loadingId: string | null;
}

function cleanText(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/[*_#`~]/g, "").replace(/\s+/g, " ").trim().slice(0, 1500);
}

export function useTTS(): UseTTSReturn {
  const [ttsState, setTtsState] = useState<TTSState>("IDLE");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);

  const stopInternal = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const stop = useCallback(() => {
    generationRef.current++;
    stopInternal();
    setSpeakingId(null);
    setLoadingId(null);
    setTtsState("IDLE");
  }, [stopInternal]);

  const playBrowserSpeech = useCallback((text: string, language: TTSLanguage, messageId: string, generation: number) =>
    new Promise<boolean>((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || generationRef.current !== generation) {
        resolve(false); return;
      }
      const utterance = new SpeechSynthesisUtterance(cleanText(text));
      utterance.lang = language === "en" ? "en-US" : "fil-PH";
      utterance.rate = 0.95;
      utterance.onstart = () => {
        if (generationRef.current !== generation) { window.speechSynthesis.cancel(); resolve(false); return; }
        setLoadingId(null); setSpeakingId(messageId); setTtsState("PLAYING");
      };
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }), []);

  const playGeneratedAudio = useCallback((audioUrl: string, messageId: string, generation: number) =>
    new Promise<boolean>((resolve) => {
      if (generationRef.current !== generation || !audioUrl.startsWith("data:audio/")) { resolve(false); return; }
      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audioRef.current = audio;
      audio.onplay = () => {
        if (generationRef.current !== generation) { audio.pause(); resolve(false); return; }
        setLoadingId(null); setSpeakingId(messageId); setTtsState("PLAYING");
      };
      audio.onended = () => { audioRef.current = null; resolve(true); };
      audio.onerror = () => { audioRef.current = null; resolve(false); };
      audio.play().catch(() => { audioRef.current = null; resolve(false); });
    }), []);

  const speak = useCallback((messageId: string, text: string, language: TTSLanguage = "tgl") => {
    if (speakingId === messageId || loadingId === messageId) { stop(); return; }
    const generation = ++generationRef.current;
    stopInternal();
    setSpeakingId(null); setLoadingId(messageId); setTtsState("LOADING");

    (async () => {
      let played = false;
      try {
        const controller = new AbortController();
        abortRef.current = controller;
        const res = await fetch("/api/tts", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleanText(text), language }),
          signal: controller.signal, cache: "no-store",
        });
        if (generationRef.current !== generation) return;
        if (res.ok) {
          const data = await res.json();
          if (typeof data?.data?.audio_url === "string") {
            played = await playGeneratedAudio(data.data.audio_url, messageId, generation);
          }
        } else {
          console.warn("[TTS] OpenAI voice request failed:", res.status);
        }
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
        console.warn("[TTS] Generated audio unavailable; using browser speech fallback.");
      }
      if (generationRef.current !== generation) return;
      if (!played) played = await playBrowserSpeech(text, language, messageId, generation);
      if (generationRef.current !== generation) return;
      if (!played) console.warn("[TTS] Neither generated audio nor browser speech could play.");
      setTtsState(played ? "IDLE" : "ERROR");
      setSpeakingId(null); setLoadingId(null); audioRef.current = null;
    })();
  }, [speakingId, loadingId, stop, stopInternal, playGeneratedAudio, playBrowserSpeech]);

  return { speak, stop, speakingId, loadingId };
}
