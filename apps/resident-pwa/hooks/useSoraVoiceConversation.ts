"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Language = "tgl" | "ceb" | "en";
type VoiceReply = {
  transcript: string;
  answer: string;
  citations: string[];
  audio: { audio_url: string; voice: string; source: string } | null;
  voice_error: string | null;
  language: Language;
};
type VoiceStatus = "idle" | "recording" | "processing" | "speaking" | "error";
const MAX_DURATION_MS = 25_000;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

function preferredMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(
    (mime) => MediaRecorder.isTypeSupported(mime)
  ) || "";
}

async function encodeBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}

/**
 * Browser-side voice controller for the EXISTING Ate Sora UI.
 * Attach startRecording/stopRecording to its current mic control;
 * do not replace its visual layout.
 */
export function useSoraVoiceConversation(options: {
  language?: Language;
  sessionId?: string;
  onReply?: (reply: VoiceReply) => void;
}) {
  const { language = "tgl", sessionId, onReply } = options;
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastReply, setLastReply] = useState<VoiceReply | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const cleanupRecording = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanupRecording();
    stopAudio();
    setStatus("idle");
  }, [cleanupRecording, stopAudio]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    cleanupRecording();
    stopAudio();
  }, [cleanupRecording, stopAudio]);

  const sendRecording = useCallback(async (blob: Blob) => {
    if (blob.size === 0 || blob.size > MAX_AUDIO_BYTES) {
      setError("Recording must be under 4 MB. Please try a shorter question.");
      setStatus("error");
      return;
    }
    setStatus("processing");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
      if (!baseUrl) throw new Error("Voice backend URL is not configured.");
      const response = await fetch(`${baseUrl}/api/v1/voice/converse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          audio_base64: await encodeBase64(blob),
          mime_type: blob.type.split(";")[0] || "audio/webm",
          language,
          session_id: sessionId || null,
        }),
      });
      if (!response.ok) throw new Error(`Voice request failed (HTTP ${response.status}).`);
      const result = await response.json();
      const reply = result.data as VoiceReply;
      if (!reply?.answer) throw new Error("Ate Sora returned an empty answer.");
      setLastReply(reply);
      onReplyRef.current?.(reply);
      if (reply.audio?.audio_url) {
        setStatus("speaking");
        const audio = new Audio(reply.audio.audio_url);
        audioRef.current = audio;
        audio.onended = () => setStatus("idle");
        audio.onerror = () => setStatus("idle");
        try {
          await audio.play();
        } catch {
          setError("Tap play to hear Ate Sora; automatic playback was blocked.");
          setStatus("idle");
        }
      } else {
        setStatus("idle");
      }
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Voice request failed.");
      setStatus("error");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [language, sessionId]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    cancel();
    setError(null);
    setLastReply(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser does not support microphone recording.");
      setStatus("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => {
        cleanupRecording();
        setError("Microphone recording failed.");
        setStatus("error");
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        cleanupRecording();
        void sendRecording(blob);
      };
      recorder.start();
      setStatus("recording");
      timeoutRef.current = setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_DURATION_MS);
    } catch {
      cleanupRecording();
      setError("Microphone permission denied or unavailable.");
      setStatus("error");
    }
  }, [cancel, cleanupRecording, sendRecording]);

  const playLastReply = useCallback(async () => {
    if (!lastReply?.audio?.audio_url) return;
    stopAudio();
    const audio = new Audio(lastReply.audio.audio_url);
    audioRef.current = audio;
    audio.onended = () => setStatus("idle");
    setStatus("speaking");
    try { await audio.play(); } catch { setStatus("idle"); }
  }, [lastReply, stopAudio]);

  return { status, error, lastReply, startRecording, stopRecording, cancel, playLastReply };
}
