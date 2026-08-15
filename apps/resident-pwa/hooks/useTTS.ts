"use client";

import { useState, useCallback, useRef } from "react";

export type TTSLanguage = "tgl" | "ceb" | "en";

interface UseTTSReturn {
  speak: (messageId: string, text: string, language?: TTSLanguage) => Promise<void>;
  stop: () => void;
  speakingId: string | null;
  loadingId: string | null;
}

export function useTTS(): UseTTSReturn {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    // Stop HTML5 Audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    // Stop Web Speech API if active
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setSpeakingId(null);
    setLoadingId(null);
  }, []);

  const speakWithBrowser = useCallback(
    (messageId: string, text: string, language: TTSLanguage = "tgl") => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setLoadingId(null);
        setSpeakingId(null);
        return;
      }

      window.speechSynthesis.cancel();

      // Clean Markdown symbols or URLs from text before speaking
      const cleanText = text
        .replace(/[*_#`~]/g, "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\n+/g, ". ");

      const utterance = new SpeechSynthesisUtterance(cleanText);

      // Select locale based on language choice
      if (language === "ceb") {
        utterance.lang = "ceb-PH";
      } else if (language === "tgl") {
        utterance.lang = "tl-PH";
      } else {
        utterance.lang = "en-US";
      }

      // Try to find a matching installed voice
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(
        (v) =>
          v.lang.toLowerCase().includes(utterance.lang.toLowerCase()) ||
          (language !== "en" && (v.lang.includes("tl") || v.lang.includes("fil")))
      );
      if (match) utterance.voice = match;

      utterance.onstart = () => {
        setLoadingId(null);
        setSpeakingId(messageId);
      };

      utterance.onend = () => {
        setSpeakingId(null);
      };

      utterance.onerror = () => {
        setLoadingId(null);
        setSpeakingId(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const speak = useCallback(
    async (messageId: string, text: string, language: TTSLanguage = "tgl") => {
      // If already speaking this message, toggle stop
      if (speakingId === messageId || loadingId === messageId) {
        stop();
        return;
      }

      stop();
      setLoadingId(messageId);

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.data?.audio_url) {
            const audio = new Audio(data.data.audio_url);
            audioRef.current = audio;

            audio.onplay = () => {
              setLoadingId(null);
              setSpeakingId(messageId);
            };

            audio.onended = () => {
              setSpeakingId(null);
              audioRef.current = null;
            };

            audio.onerror = () => {
              // Service audio playback failed, fallback to Web Speech API
              speakWithBrowser(messageId, text, language);
            };

            await audio.play();
            return;
          }
        }
      } catch (err) {
        console.warn("[TTS Backend Warning] Falling back to Web Speech API:", err);
      }

      // Fallback to Web Speech API
      speakWithBrowser(messageId, text, language);
    },
    [speakingId, loadingId, stop, speakWithBrowser]
  );

  return { speak, stop, speakingId, loadingId };
}
