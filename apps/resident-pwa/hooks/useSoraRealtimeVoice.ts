"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type SoraRealtimeLanguage = "tgl" | "ceb" | "en";
type Status = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
interface EventMessage {
  type?: string; name?: string; call_id?: string; arguments?: string;
  transcript?: string; item_id?: string; error?: { message?: string };
}
interface Options {
  language: SoraRealtimeLanguage; sessionId: string;
  onUserTranscript?: (value: string) => void;
  onAssistantMessage?: (value: string, citations: string[]) => void;
}

export function useSoraRealtimeVoice(options: Options) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);
  const activeCalls = useRef(new Set<string>());
  const emittedItems = useRef(new Set<string>());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const stop = useCallback(() => {
    generationRef.current++;
    channelRef.current?.close(); channelRef.current = null;
    peerRef.current?.close(); peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.srcObject = null; audioRef.current.remove(); audioRef.current = null; }
    activeCalls.current.clear(); emittedItems.current.clear();
    setStatus("idle"); setError(null);
  }, []);

  const runTool = useCallback(async (event: EventMessage, channel: RTCDataChannel) => {
    const callId = event.call_id;
    if (!callId || activeCalls.current.has(callId)) return;
    activeCalls.current.add(callId);
    let result: Record<string, unknown>;
    try {
      if (event.name !== "get_official_barangay_answer") throw new Error("Unsupported tool");
      const args = JSON.parse(event.arguments || "{}") as { query?: unknown; language?: unknown };
      const query = typeof args.query === "string" ? args.query.trim() : "";
      if (!query || query.length > 4000 || !["tgl", "ceb", "en"].includes(String(args.language))) throw new Error("Invalid query");
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ message: query, sessionId: optionsRef.current.sessionId, language: optionsRef.current.language }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Official information unavailable");
      result = { answer: data.answer, citations: Array.isArray(data.citations) ? data.citations : [], context_used: data.context_used === true };
    } catch {
      result = { error: "Official Barangay information is unavailable. Do not guess; direct the resident to Barangay staff." };
    } finally { activeCalls.current.delete(callId); }
    if (channel.readyState !== "open") return;
    channel.send(JSON.stringify({ type: "conversation.item.create", item: {
      type: "function_call_output", call_id: callId, output: JSON.stringify(result),
    } }));
    channel.send(JSON.stringify({ type: "response.create" }));
  }, []);

  const start = useCallback(async () => {
    if (peerRef.current) return;
    const generation = ++generationRef.current;
    setError(null); setStatus("connecting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") throw new Error("This browser does not support real-time voice.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (generationRef.current !== generation) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const peer = new RTCPeerConnection(); peerRef.current = peer;
      const audio = document.createElement("audio"); audio.autoplay = true; audio.setAttribute("playsinline", "true"); audioRef.current = audio;
      peer.ontrack = (event) => { audio.srcObject = event.streams[0]; void audio.play().catch(() => setError("Tap the page once to allow voice playback.")); };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
          setStatus("error"); setError("Voice connection interrupted. End the session and try again.");
        }
      };
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const channel = peer.createDataChannel("sora-events"); channelRef.current = channel;
      channel.onopen = () => { if (generationRef.current === generation) setStatus("listening"); };
      channel.onmessage = (message) => {
        let event: EventMessage;
        try { event = JSON.parse(message.data) as EventMessage; } catch { return; }
        if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript?.trim()) {
          optionsRef.current.onUserTranscript?.(event.transcript.trim()); return;
        }
        if (event.type === "response.function_call_arguments.done") { void runTool(event, channel); return; }
        if (event.type === "response.output_audio_transcript.done" && event.transcript?.trim()) {
          const id = event.item_id || event.transcript;
          if (!emittedItems.current.has(id)) { emittedItems.current.add(id); optionsRef.current.onAssistantMessage?.(event.transcript.trim(), []); }
          return;
        }
        if (event.type === "response.created") setStatus("thinking");
        if (event.type === "response.output_audio.delta") setStatus("speaking");
        if (event.type === "response.done" && peer.connectionState === "connected") setStatus("listening");
        if (event.type === "error") { setStatus("error"); setError(event.error?.message || "Realtime voice error."); }
      };
      const offer = await peer.createOffer(); await peer.setLocalDescription(offer);
      const response = await fetch("/api/realtime/session", {
        method: "POST", headers: { "Content-Type": "application/sdp", "x-sora-language": optionsRef.current.language },
        body: offer.sdp || "", cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Unable to start voice session.");
      }
      const answer = await response.text();
      if (generationRef.current === generation) await peer.setRemoteDescription({ type: "answer", sdp: answer });
    } catch (cause) {
      if (generationRef.current !== generation) return;
      stop(); setStatus("error"); setError(cause instanceof Error ? cause.message : "Unable to start real-time voice.");
    }
  }, [runTool, stop]);

  useEffect(() => () => stop(), [stop]);
  return { status, error, start, stop };
}
