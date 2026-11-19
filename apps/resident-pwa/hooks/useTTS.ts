"use client";

import { useState, useCallback, useRef } from "react";

export type TTSLanguage = "tgl" | "ceb" | "en";
type TTSState = "IDLE" | "LOADING" | "PLAYING" | "ERROR";
interface UseTTSReturn {
  speak: (messageId: string, text: string, language?: TTSLanguage, preferFast?: boolean) => void;
  stop: () => void;
  speakingId: string | null;
  loadingId: string | null;
  playbackError: string | null;
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
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
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
    utteranceRef.current = null;
  }, []);

  const stop = useCallback(() => {
    generationRef.current++;
    stopInternal();
    setSpeakingId(null);
    setLoadingId(null);
    setTtsState("IDLE");
    setPlaybackError(null);
  }, [stopInternal]);

  const playBrowserSpeech = useCallback((text: string, language: TTSLanguage, messageId: string, generation: number) =>
    new Promise<boolean>((resolve) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window) || generationRef.current !== generation) {
        resolve(false); return;
      }
      const utterance = new SpeechSynthesisUtterance(cleanText(text));
      utteranceRef.current = utterance; // Safari can collect an unreferenced utterance early.
      utterance.lang = language === "en" ? "en-US" : language === "ceb" ? "fil-PH" : "fil-PH";
      utterance.rate = 0.96;
      let settled = false;
      let began = false;
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(startTimeout);
        utteranceRef.current = null;
        resolve(ok);
      };
      // Some iPhone browsers silently refuse autoplay without firing an error.
      // Recover instead of showing a fake talking avatar indefinitely.
      const startTimeout = window.setTimeout(() => {
        if (!began) { window.speechSynthesis.cancel(); finish(false); }
      }, 2800);
      utterance.onstart = () => {
        if (generationRef.current !== generation) { window.speechSynthesis.cancel(); finish(false); return; }
        began = true;
        window.clearTimeout(startTimeout);
        setLoadingId(null); setSpeakingId(messageId); setTtsState("PLAYING");
      };
      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);
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

  const speak = useCallback((messageId: string, text: string, language: TTSLanguage = "tgl", preferFast = false) => {
    if (speakingId === messageId || loadingId === messageId) { stop(); return; }
    const generation = ++generationRef.current;
    stopInternal();
    setSpeakingId(null); setLoadingId(messageId); setTtsState("LOADING");
    setPlaybackError(null);

    (async () => {
      let played = false;
      // The voice-mode greeting is initiated by a real tap. Speak immediately
      // using device voices, rather than first waiting up to 55s for cloud TTS.
      if (preferFast) played = await playBrowserSpeech(text, language, messageId, generation);
      if (generationRef.current !== generation) return;

      if (!played) {
        const controller = new AbortController();
        abortRef.current = controller;
        const deadline = window.setTimeout(() => controller.abort(), 8500);
        try {
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
            console.warn("[TTS] Generated voice HTTP", res.status);
          }
        } catch (error) {
          if (generationRef.current !== generation) return;
          console.warn("[TTS] Generated voice did not start promptly; using device voice.");
        } finally {
          window.clearTimeout(deadline);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
      if (generationRef.current !== generation) return;
      if (!played && !preferFast) played = await playBrowserSpeech(text, language, messageId, generation);
      if (generationRef.current !== generation) return;
      if (!played) {
        setPlaybackError("No audio started. Tap Listen on the reply and check your device volume and sound settings.");
        console.warn("[TTS] No audible voice playback was available.");
      }
      setTtsState(played ? "IDLE" : "ERROR");
      setSpeakingId(null); setLoadingId(null); audioRef.current = null;
    })();
  }, [speakingId, loadingId, stop, stopInternal, playGeneratedAudio, playBrowserSpeech]);

  return { speak, stop, speakingId, loadingId, playbackError };
}
