"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TTSLanguage } from "./useTTS";

interface UseSTTReturn {
  isListening: boolean;
  isSupported: boolean;
  startListening: (language?: TTSLanguage, onResult?: (text: string) => void) => void;
  stopListening: () => void;
  toggleListening: (language?: TTSLanguage, onResult?: (text: string) => void) => void;
}

export function useSTT(): UseSTTReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSupported(true);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore if already stopped
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(
    (language: TTSLanguage = "ceb", onResult?: (text: string) => void) => {
      if (typeof window === "undefined") return;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert("Speech Recognition is not supported on this browser. Please use Google Chrome or Microsoft Edge.");
        return;
      }

      stopListening();

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = true;

      // Select target language recognition code
      if (language === "ceb") {
        // Chrome/Edge commonly do not expose ceb-PH. Filipino is the closest
        // supported recognition locale and still handles common Bisaya speech.
        recognition.lang = "fil-PH";
      } else if (language === "tgl") {
        recognition.lang = "tl-PH";
      } else {
        recognition.lang = "en-US";
      }

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcriptText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcriptText += event.results[i][0].transcript;
        }
        // Do not submit interim words; wait until the browser marks the phrase final.
        const isFinal = event.results[event.results.length - 1]?.isFinal;
        if (onResult && transcriptText && isFinal) {
          onResult(transcriptText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[STT Error]", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      try {
        recognition.start();
      } catch (err) {
        console.error("[STT Start Error]", err);
        setIsListening(false);
      }
    },
    [stopListening]
  );

  const toggleListening = useCallback(
    (language: TTSLanguage = "ceb", onResult?: (text: string) => void) => {
      if (isListening) {
        stopListening();
      } else {
        startListening(language, onResult);
      }
    },
    [isListening, startListening, stopListening]
  );

  return { isListening, isSupported, startListening, stopListening, toggleListening };
}
