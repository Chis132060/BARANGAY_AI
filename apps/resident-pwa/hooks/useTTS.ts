"use client";

import { useState, useCallback, useRef } from "react";

export type TTSLanguage = "tgl" | "ceb" | "en";

// ── Playback State Machine ────────────────────────────────────────────────────
// IDLE → LOADING → PLAYING → IDLE
//                         → ERROR → IDLE
// Any state can transition to IDLE via stop().
type TTSState = "IDLE" | "LOADING" | "PLAYING" | "ERROR";

interface UseTTSReturn {
  speak: (messageId: string, text: string, language?: TTSLanguage) => void;
  stop: () => void;
  speakingId: string | null;
  loadingId: string | null;
}

// ── Sentence Segmentation ─────────────────────────────────────────────────────
// Splits text into natural spoken chunks without breaking abbreviations,
// numbers, currency, or URLs.
function segmentSentences(text: string): string[] {
  // 1. Strip Markdown formatting
  const clean = text
    .replace(/[*_#`~]/g, "")
    .replace(/https?:\/\/\S+/g, "link")
    .replace(/\n+/g, " ");

  // 2. Sentence boundary: split on [.!?;:] followed by space+uppercase,
  //    but not on abbreviations like "Dra.", "No.", "Ph.D.", currency "₱10.50"
  const raw = clean.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ])/);

  // 3. Merge very short fragments (< 15 chars) with the next sentence
  const merged: string[] = [];
  for (const s of raw) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (merged.length > 0 && merged[merged.length - 1].length < 15) {
      merged[merged.length - 1] += " " + trimmed;
    } else {
      merged.push(trimmed);
    }
  }

  // 4. Guard: if segmentation produces nothing, return the full clean text
  return merged.length > 0 ? merged : [clean.trim()];
}

// ── Best Available Browser Voice ──────────────────────────────────────────────
// Prefers language-specific voices, degrades gracefully down to en-US.
function selectVoice(language: TTSLanguage): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Ordered preference lists per language
  const preferences: Record<TTSLanguage, string[]> = {
    ceb: ["ceb", "ceb-PH", "fil", "fil-PH", "tl", "tl-PH", "en-PH", "en-US", "en"],
    tgl: ["tl", "tl-PH", "fil", "fil-PH", "en-PH", "en-US", "en"],
    en:  ["en-US", "en-GB", "en-AU", "en-PH", "en"],
  };

  for (const pref of preferences[language]) {
    const found = voices.find((v) =>
      v.lang.toLowerCase().startsWith(pref.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useTTS(): UseTTSReturn {
  const [ttsState, setTtsState] = useState<TTSState>("IDLE");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Refs so callbacks always see the latest value without stale closures
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const abortRef     = useRef<AbortController | null>(null);
  const generationRef = useRef<number>(0); // increments on every new speak() call

  // ── Internal Stop ───────────────────────────────────────────────────────────
  const stopInternal = useCallback(() => {
    // Cancel any in-flight fetch
    abortRef.current?.abort();
    abortRef.current = null;

    // Stop HTML5 Audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    // Stop browser speech
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // ── Public Stop ─────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    generationRef.current++; // invalidate any queued operations
    stopInternal();
    setSpeakingId(null);
    setLoadingId(null);
    setTtsState("IDLE");
  }, [stopInternal]);

  // ── Browser Fallback for ONE sentence ──────────────────────────────────────
  const speakSentenceWithBrowser = useCallback(
    (
      sentence: string,
      language: TTSLanguage,
      generation: number,
      messageId: string
    ): Promise<void> =>
      new Promise((resolve) => {
        if (generationRef.current !== generation) { resolve(); return; }
        if (typeof window === "undefined" || !("speechSynthesis" in window)) { resolve(); return; }

        const utterance = new SpeechSynthesisUtterance(sentence);
        const voice = selectVoice(language);
        if (voice) utterance.voice = voice;

        // Language BCP-47 fallback
        utterance.lang =
          language === "ceb" ? (voice?.lang ?? "fil-PH") :
          language === "tgl" ? (voice?.lang ?? "tl-PH") :
          "en-US";

        utterance.onstart = () => {
          if (generationRef.current !== generation) {
            window.speechSynthesis.cancel();
            resolve();
            return;
          }
          setLoadingId(null);
          setSpeakingId(messageId);
          setTtsState("PLAYING");
        };

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve(); // continue queue even on error

        window.speechSynthesis.speak(utterance);
      }),
    []
  );

  // ── Play ONE audio URL from the TTS service ─────────────────────────────────
  const playSentenceAudio = useCallback(
    (audioUrl: string, messageId: string, generation: number): Promise<void> =>
      new Promise((resolve) => {
        if (generationRef.current !== generation) { resolve(); return; }

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          if (generationRef.current !== generation) {
            audio.pause();
            resolve();
            return;
          }
          setLoadingId(null);
          setSpeakingId(messageId);
          setTtsState("PLAYING");
        };
        audio.onended = () => { audioRef.current = null; resolve(); };
        audio.onerror = () => { audioRef.current = null; resolve(); }; // let caller fallback

        audio.play().catch(() => { audioRef.current = null; resolve(); });
      }),
    []
  );

  // ── Main speak entry point ──────────────────────────────────────────────────
  const speak = useCallback(
    (messageId: string, text: string, language: TTSLanguage = "tgl") => {
      // Toggle-stop if already loading/playing this message
      if (speakingId === messageId || loadingId === messageId) {
        stop();
        return;
      }

      // Cancel any previous speech and increment generation counter
      const generation = ++generationRef.current;
      stopInternal();

      setSpeakingId(null);
      setLoadingId(messageId);
      setTtsState("LOADING");

      const sentences = segmentSentences(text);

      // Run asynchronously but don't make speak() itself async
      (async () => {
        for (const sentence of sentences) {
          if (generationRef.current !== generation) break; // cancelled

          try {
            const controller = new AbortController();
            abortRef.current = controller;

            const res = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: sentence, language }),
              signal: controller.signal,
            });

            if (generationRef.current !== generation) break;

            if (res.ok) {
              const data = await res.json();
              if (data?.data?.audio_url) {
                await playSentenceAudio(data.data.audio_url, messageId, generation);
                if (generationRef.current !== generation) break;
                continue; // next sentence
              }
            }
          } catch (err: any) {
            if (err?.name === "AbortError") break; // user stopped
            // fall through to browser fallback for this sentence
          }

          // Browser fallback for this sentence
          await speakSentenceWithBrowser(sentence, language, generation, messageId);
          if (generationRef.current !== generation) break;
        }

        // Only clean up if this generation is still active
        if (generationRef.current === generation) {
          setSpeakingId(null);
          setLoadingId(null);
          setTtsState("IDLE");
          audioRef.current = null;
        }
      })();
    },
    [speakingId, loadingId, stop, stopInternal, playSentenceAudio, speakSentenceWithBrowser]
  );

  return { speak, stop, speakingId, loadingId };
}

