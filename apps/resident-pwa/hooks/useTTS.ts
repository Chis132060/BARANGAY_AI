"use client";

import { useState, useCallback, useRef } from "react";

export type TTSLanguage = "tgl" | "ceb" | "en";
type TTSState = "IDLE" | "LOADING" | "PLAYING" | "ERROR";
interface UseTTSReturn {
  speak: (messageId: string, text: string, language?: TTSLanguage) => void;
  stop: () => void;
  speakingId: string | null;
  loadingId: string | null;
  playbackError: string | null;
  playbackNotice: string | null;
  retryLastSpeech: () => void;
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
  const [playbackNotice, setPlaybackNotice] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  // Keep only the latest generated audio in memory for an iPhone tap-to-replay.
  const cachedNaturalAudioRef = useRef<{ text: string; language: TTSLanguage; url: string } | null>(null);
  const lastSpeechRef = useRef<{ messageId: string; text: string; language: TTSLanguage } | null>(null);

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
    setPlaybackNotice(null);
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

  // The cloud provider returns the configured Ate Sora voice. A blocked iOS
  // autoplay is distinct from a provider failure: preserve the audio for a
  // direct tap to replay rather than silently switching to a robotic voice.
  const playGeneratedAudio = useCallback((audioUrl: string, messageId: string, generation: number) =>
    new Promise<"finished" | "blocked" | "failed">((resolve) => {
      if (generationRef.current !== generation || !audioUrl.startsWith("data:audio/")) {
        resolve("failed"); return;
      }
      const audio = new Audio(audioUrl);
      audio.preload = "auto";
      audioRef.current = audio;
      let settled = false;
      const finish = (result: "finished" | "blocked" | "failed") => {
        if (settled) return;
        settled = true;
        audio.onplay = null; audio.onended = null; audio.onerror = null; audio.onpause = null;
        if (audioRef.current === audio) audioRef.current = null;
        resolve(result);
      };
      audio.onplay = () => {
        if (generationRef.current !== generation) { audio.pause(); finish("failed"); return; }
        setLoadingId(null); setSpeakingId(messageId); setTtsState("PLAYING");
      };
      audio.onended = () => finish("finished");
      audio.onerror = () => finish("failed");
      audio.onpause = () => { if (!audio.ended) finish("failed"); };
      void audio.play().catch((error: unknown) => {
        const name = error instanceof Error ? error.name : "";
        finish(name === "NotAllowedError" ? "blocked" : "failed");
      });
    }), []);

  const speak = useCallback((messageId: string, text: string, language: TTSLanguage = "tgl") => {
    if (speakingId === messageId || loadingId === messageId) { stop(); return; }
    const generation = ++generationRef.current;
    stopInternal();
    const spokenText = cleanText(text);
    lastSpeechRef.current = { messageId, text, language };
    setSpeakingId(null); setLoadingId(messageId); setTtsState("LOADING");
    setPlaybackError(null); setPlaybackNotice(null);

    void (async () => {
      let providerResult: "finished" | "blocked" | "failed" = "failed";
      // Fast Talk returns the grounded text immediately, but voice quality
      // should NOT depend on whether the resident used Fast Talk or Record.
      // Always try the existing configured Gemini/OpenAI Ate Sora voice first.
      const cached = cachedNaturalAudioRef.current;
      if (cached?.text === spokenText && cached.language === language) {
        providerResult = await playGeneratedAudio(cached.url, messageId, generation);
        if (providerResult === "failed") cachedNaturalAudioRef.current = null;
      } else if (typeof navigator === "undefined" || navigator.onLine !== false) {
        const controller = new AbortController();
        abortRef.current = controller;
        // Give natural speech enough time to start; the previous 8.5-second
        // deadline was too short and caused frequent generic device fallback.
        const deadline = window.setTimeout(() => controller.abort(), 22000);
        try {
          const res = await fetch("/api/tts", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: spokenText, language }),
            signal: controller.signal, cache: "no-store",
          });
          if (generationRef.current !== generation) return;
          if (res.ok) {
            const data = await res.json();
            const audioUrl = data?.data?.audio_url;
            if (typeof audioUrl === "string" && audioUrl.startsWith("data:audio/")) {
              cachedNaturalAudioRef.current = { text: spokenText, language, url: audioUrl };
              providerResult = await playGeneratedAudio(audioUrl, messageId, generation);
            }
          } else {
            console.warn("[TTS] Natural voice unavailable, HTTP", res.status);
          }
        } catch {
          if (generationRef.current !== generation) return;
          console.warn("[TTS] Natural voice timed out or could not be reached.");
        } finally {
          window.clearTimeout(deadline);
          if (abortRef.current === controller) abortRef.current = null;
        }
      }
      if (generationRef.current !== generation) return;
      if (providerResult === "blocked") {
        // Keep the natural voice cached: the user can now tap to play it
        // directly from a gesture, even when Safari blocks async autoplay.
        setPlaybackError("Your phone blocked automatic audio. Tap Hear natural voice to play Ate Sora.");
        setTtsState("ERROR"); setSpeakingId(null); setLoadingId(null);
        return;
      }

      let played = providerResult === "finished";
      if (!played) {
        setPlaybackNotice("Natural Ate Sora voice is unavailable. Using your phone's basic voice as backup.");
        played = await playBrowserSpeech(text, language, messageId, generation);
      }
      if (generationRef.current !== generation) return;
      if (!played) {
        setPlaybackError("No audio started. Tap Hear natural voice and check your phone's sound settings.");
        console.warn("[TTS] Neither natural voice nor device voice could play.");
      }
      setTtsState(played ? "IDLE" : "ERROR");
      setSpeakingId(null); setLoadingId(null);
    })();
  }, [speakingId, loadingId, stop, stopInternal, playGeneratedAudio, playBrowserSpeech]);

  const retryLastSpeech = useCallback(() => {
    const last = lastSpeechRef.current;
    if (last) speak(last.messageId, last.text, last.language);
  }, [speak]);

  return { speak, stop, speakingId, loadingId, playbackError, playbackNotice, retryLastSpeech };
}
